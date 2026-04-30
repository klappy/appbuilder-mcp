---
uri: klappy://canon/articles/payload-construction
title: "Payload Construction — How to Build a v1 submit_build Job"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "payload", "submit-build", "schema"]
derives_from: "klappy://canon/articles/payload-construction (ptxprint-mcp — same article shape, AppBuilder schema)"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/bundled-debug-keystore.md, canon/articles/cli-reference.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft
---

# Payload Construction — How to Build a v1 submit_build Job

> An agent-facing reference. The schema of record is `src/payload.ts`. This
> article shows what each field means, what's required vs. optional, and
> what minimum payload produces a working APK.

---

## The minimum payload

Three fields are required: `name`, `package`, `bible_source`. Everything
else has a sensible default that produces a real APK.

```json
{
  "schema_version": "1.0",
  "name": "Web Bible",
  "package": "org.ebible.web",
  "bible_source": {
    "kind": "usfm_zip",
    "url": "https://example.org/eng-web_usfm.zip",
    "sha256": "..."
  }
}
```

The Container materializes the bible zip, runs `scripture-app-builder -new
-n "Web Bible" -p org.ebible.web -b /tmp/.../bible.usfm.zip -ks
<bundled-debug.keystore> -i <bundled-debug.properties> -fp build=...`, and
uploads the resulting APK to R2.

The APK is signed with the bundled debug keystore. **It will not be
accepted by the Play Store and is not safe for production distribution.**
For production, supply your own keystore — see Signing below.

---

## Field-by-field

### `schema_version` (required, literal "1.0")

The schema-version literal locks the contract. Future bumps add fields
strictly (old payloads remain valid).

### `name` (required, 1..64 chars)

The human-readable app name. Becomes the launcher label and the title in
the manifest. Anything Unicode that fits in an Android app label works;
keep it short — long labels truncate on launchers.

### `package` (required, Java reverse-DNS)

The Android application ID. Must match the regex
`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` — Java's package-name rules.
Conventionally three segments (`org.example.app`). Once an APK is
published with a given package, that package belongs to that app on the
device — you cannot change it without users uninstalling and reinstalling.

### `bible_source` (required)

The bible content the SAB CLI will consume via its `-b` flag.

```
{
  "kind": "usfm_zip" | "usx_zip",
  "url": "<https URL>",
  "sha256": "<64 hex chars>"
}
```

The Container streams the URL and verifies sha256 as bytes arrive; a
mismatch is a hard failure before SAB ever runs.

The burrito-capable upstream tag will add `kind: "burrito_zip"`. That is a
schema_version bump to "1.1"; current 1.0 payloads remain valid.

### `about_url`, `about_sha256` (optional)

A `.txt` file shown in the app's About screen. If absent, SAB falls back
to its bundled default about template. If `about_url` is present,
`about_sha256` is required.

### `icons` (optional, default `[]`)

```
[
  { "filename": "icon-72.png", "url": "...", "sha256": "..." },
  { "filename": "icon-144.png", "url": "...", "sha256": "..." }
]
```

Each icon is passed to SAB as `-ic <path>`. SAB expects PNGs in standard
Android density buckets (mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi
192). Provide what you have; SAB scales up missing densities. If the
array is empty, SAB uses its bundled default icon — fine for testing,
not for distribution.

### `keystore` (optional)

```
{
  "keystore_url": "...",
  "keystore_sha256": "...",
  "info_url": "...",
  "info_sha256": "..."
}
```

When present, the Container fetches both URLs and passes them to SAB as
`-ks <keystore>` and `-i <info>`. The info file is a plaintext file in
the format SAB expects (lines like `storePassword=...`, `keyAlias=...`,
`keyPassword=...`).

When absent, the Container substitutes the bundled debug keystore. See
`klappy://canon/articles/bundled-debug-keystore`.

### `build_modern_pwa` (optional, default `false`)

When `true`, passes `-build-modern-pwa` to SAB. v0.1 still produces an APK
as the primary artifact; PWA HTML output is a v1.x add. Today this flag
is mostly inert — included so payloads that want PWA-flavored APK
behavior can request it.

---

## Cache discipline (RFC 8785 JCS)

Two payloads are cached identically iff their canonical JSON serializations
are byte-identical. Canonicalization sorts object keys lexicographically
and strips all whitespace, so the following two payloads share a cache:

```json
{ "name": "X", "package": "a.b.c", ... }
```

```json
{
  "package": "a.b.c",
  "name": "X",
  ...
}
```

They will not share a cache with:

- A payload that adds an empty `icons: []` (vs. omitting it). Defaults are
  applied by zod *before* canonicalization, so an explicit `icons: []` and
  an absent `icons` produce the same canonical form. (zod's `.default([])`
  resolves to an empty array.) This is the intended behavior.
- A payload with whitespace differences in URLs (URL strings are not
  normalized).
- A payload with the same content but different sha256 hex case
  (canonicalize is case-sensitive; treat sha256 as lowercase by
  convention).

If a cache hit is unexpected, dump both payloads through the same
canonicalize() and diff the resulting strings — that's the byte-exact
view the hash sees.

---

## What you do *not* put in the payload

- **Cloudflare credentials.** The Worker handles all R2 writes and DO
  updates.
- **Output paths.** `outputs/<hash>/<package>_<sanitized-name>_appbuilder.apk`
  is computed deterministically from the payload.
- **Builder selection.** v1 is SAB-only. The builder is implicit.
- **Android SDK / JDK / Gradle config.** All container-managed.
- **Project-level state.** The MCP is stateless — every submit is
  self-contained.

---

## Provenance

This article's structure is forked from
`klappy://canon/articles/payload-construction` in ptxprint-mcp. The schema
itself is fresh for AppBuilder; the canonicalization-and-cache discussion
is shared word-for-word in spirit because the JCS pattern is universal.
