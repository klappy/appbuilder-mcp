---
uri: klappy://canon/articles/bundled-debug-keystore
title: "Bundled Debug Keystore — What the Container Ships"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "keystore", "signing", "container", "bundle", "phase-0", "source-of-truth"]
type: bundled_asset
asset_id: bundled-debug-keystore
asset_version: "1.0"
upstream_provided: false
derives_from: "klappy://canon/articles/bundled-default-cfg (ptxprint-mcp — same Phase-0 floor pattern, applied to APK signing instead of PTXprint config)"
companion_to: "canon/articles/payload-construction.md, canon/articles/cli-reference.md"
canonical_status: non_canonical
date: 2026-04-30
status: working
---

# Bundled Debug Keystore — What the Container Ships

> **What this answers.** What signing material does the Container ship
> with? What does it produce? When does an agent need to override it?
>
> **Provenance.** Structurally derived from
> `klappy://canon/articles/bundled-default-cfg` (ptxprint-mcp's
> bundled-default-cfg pattern). Where ptxprint-mcp ships a default
> `ptxprint.cfg` so callers can submit minimum payloads and get a
> publication-quality PDF, appbuilder-mcp ships a debug keystore so
> callers can submit minimum payloads and get a runnable APK. The two
> articles are sister documents — same shape, different domain.

---

## What ships

Inside `/app-builders/debug-keystore/` in the Container image, generated at
Docker build time via `keytool -genkey`:

| File | Purpose |
|---|---|
| `debug.keystore` | Java keystore (`JKS`), RSA 2048, 10000-day validity |
| `debug.properties` | Plaintext info file passed to SAB as `-i` |

The credentials are deliberately public (this is a debug keystore — the
threat model is "this APK runs on a developer device or an end-user
testing it," not "this APK signs a release published to Play Store"):

```
storePassword = appbuilder-mcp-debug
keyAlias       = appbuilder-mcp-debug
keyPassword    = appbuilder-mcp-debug
```

Subject DN: `CN=appbuilder-mcp debug, OU=appbuilder-mcp, O=klappy, L=Unknown, ST=Unknown, C=US`.

The Container exports two env vars referencing these paths:

```
APPBUILDER_DEBUG_KEYSTORE      = /app-builders/debug-keystore/debug.keystore
APPBUILDER_DEBUG_KEYSTORE_INFO = /app-builders/debug-keystore/debug.properties
```

`container/main.py` reads these env vars when `payload.keystore` is
absent.

---

## What it produces

A minimum payload of `{name, package, bible_source}` produces an APK that:

- **Runs** on any Android device (debug-signed APKs are valid for
  installation).
- **Installs** via `adb install` or by sideloading.
- **Will not be accepted** by the Google Play Store (Play requires
  upload-key signing on a fresh keystore, plus Play App Signing).
- **Should not be redistributed** beyond your own device or test pool.
  The signing key is public and shared across every appbuilder-mcp
  Container running this version. Two APKs signed with this keystore are
  trivially identifiable as "appbuilder-mcp debug builds" by anyone who
  cares to look.

This matches the Phase-0 ladder rung from
`klappy://canon/articles/progressive-customization` (ptxprint-mcp): the
out-of-the-box experience is operational and useful for testing, with a
clear "level up" path documented loudly.

---

## When an agent needs to override

Override the bundled keystore (by supplying `payload.keystore`) for any
of the following:

- **Distributing to anyone other than yourself.** If the APK leaves your
  laptop and lands on someone else's device, you should sign it with a
  keystore you control.
- **Production releases.** Always.
- **Long-lived test installations.** A debug-keystore APK can be
  uninstalled and reinstalled freely; a release-keystore APK has the
  identity continuity Play and Android internals expect.
- **Multi-app environments where keystore identity matters.** If your
  organization tracks app signing for any reason, route through your own
  keystore.

The override path:

```json
{
  "schema_version": "1.0",
  "name": "...",
  "package": "...",
  "bible_source": { ... },
  "keystore": {
    "keystore_url": "https://your-storage/release.keystore",
    "keystore_sha256": "<64 hex>",
    "info_url": "https://your-storage/release-info.txt",
    "info_sha256": "<64 hex>"
  }
}
```

The `info_url` points at a plaintext file SAB consumes; format:

```
storePassword=<your-store-password>
keyAlias=<your-alias>
keyPassword=<your-key-password>
```

The Container fetches both URLs, sha256-verifies, and passes paths to SAB
via `-ks` and `-i`.

---

## Why bundle a keystore at all

Two questions a thoughtful reviewer would raise.

**"Doesn't bundling a keystore violate vodka-architecture?"** It pushes the
"thin Worker" line, yes. But `vodka-architecture` (klappy.dev canon) is a
question about **opinions**, not **assets**. The keystore is a fixture, not
a domain opinion. The same way ptxprint-mcp bundles `ptxprint.cfg` and
upstream Charis fonts. It's the floor an out-of-box submission lands on,
not a recommendation we're encoding about how to sign Bibles.

**"Doesn't a public keystore violate signing best practice?"** It would,
if anyone were redistributing these APKs. The mitigation is documentation
plus the obvious naming: every artifact signed with this keystore has the
literal string "appbuilder-mcp debug" in its certificate subject. There
is no plausible scenario where someone publishes a debug-signed APK to
Play and Google's signing infrastructure doesn't reject it. The keystore
is for "I built an APK, I want to install it on my Pixel and see if it
works." That is exactly the Phase-0 floor.

---

## Rotation

The keystore is regenerated every Container image build (the `keytool
-genkey` step in `Dockerfile`). A given image tag has a stable keystore;
rebuilding produces a fresh one. There is no operational reason to
preserve continuity across image builds for the debug keystore — anyone
relying on certificate continuity should be using their own keystore via
the override path.

If a security incident requires invalidating builds signed by a specific
debug keystore, the response is "rebuild and redeploy the image; the new
keystore replaces the old; affected users reinstall." The blast radius is
"every debug-signed APK from a particular image tag" — small by
construction.

---

## Provenance and references

This article is the AppBuilder analog of
`klappy://canon/articles/bundled-default-cfg` from ptxprint-mcp. The
Phase-0 floor pattern, the override discipline, the "loud documentation
of when to level up" — all forked verbatim. The keystore-vs-cfg
substitution is the only domain-specific delta.

See also:

- `klappy://canon/articles/payload-construction` — the override-payload shape.
- `klappy://canon/articles/cli-reference` — the SAB `-ks` / `-i` flags.
- `klappy://canon/handoffs/burrito-tag-handoff` — the next concrete
  Container-side milestone after this floor settles.
