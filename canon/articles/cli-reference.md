---
uri: klappy://canon/articles/cli-reference
title: "CLI Reference — How the Container Invokes Scripture App Builder"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "cli", "flags", "scripture-app-builder"]
derives_from: "klappy://canon/articles/cli-reference (ptxprint-mcp — same article shape, SAB CLI surface)"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/payload-construction.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft
upstream_source: "https://github.com/sillsdev/docker-appbuilder-agent/blob/develop/ansible/roles/app-builders/tasks/main.yml"
---

# CLI Reference — How the Container Invokes Scripture App Builder

> What the Container actually runs when a `submit_build` lands. The CLI
> binaries originate in `ghcr.io/sillsdev/app-builders` (a builder-stage
> tarball) and reach our runtime via
> `ghcr.io/sillsdev/appbuilder-agent-prd`, which symlinks them into
> `/usr/local/bin/`. The flag surface itself is upstream's contract,
> not ours; this article is the authoritative record of what we
> currently invoke.

---

## The invocation

For every dispatched job, `container/main.py` runs:

```
HOME=/root scripture-app-builder \
  -new \
  -n <payload.name> \
  -p <payload.package> \
  -b <materialized bible zip> \
  -ks <keystore> \
  -i <keystore-info> \
  [-a <about.txt>] \
  [-ic <icon-path>]... \
  [-build-modern-pwa] \
  -fp build=<scratch-build-dir>
```

The `[ ]` brackets denote conditional flags. `-a`, `-ic`, and
`-build-modern-pwa` are emitted only when the payload has the corresponding
field populated (see `klappy://canon/articles/payload-construction`).

---

## Flag-by-flag

### `-new`

Tells SAB to create a fresh app project rather than reopening one.
v1 always runs in `-new` mode — the Container is stateless, so there is
no project to reopen.

A v1.x enhancement could add `-open` mode for callers who want to iterate
on an existing project; this would require persisting project state to
R2 between submits, which moves us off the "pure function" line. Likely
not worth it; if a caller wants iteration, they re-submit a refined
payload.

### `-n <name>`

The human-readable app name. Becomes the launcher label and the
manifest's `application:label` attribute. Maps directly to
`payload.name`.

### `-p <package>`

The Android application ID (Java reverse-DNS form). Maps directly to
`payload.package`. SAB rejects malformed package names; we pre-validate
in `src/payload.ts` for fast feedback.

### `-b <bible-archive>`

The bible content. SAB accepts USFM zips and USX zips by content
sniffing; the kind discriminator in `payload.bible_source.kind` is for
our own clarity (and for the future burrito tag's discrimination).

### `-ks <keystore-path>`, `-i <keystore-info-path>`

Signing material. The `-ks` argument is the Java keystore (`.keystore`).
The `-i` argument is a plaintext file with three lines:

```
storePassword=<password>
keyAlias=<alias>
keyPassword=<password>
```

When `payload.keystore` is absent, the Container substitutes the bundled
debug keystore (env vars `APPBUILDER_DEBUG_KEYSTORE` and
`APPBUILDER_DEBUG_KEYSTORE_INFO`, set in the Dockerfile). See
`klappy://canon/articles/bundled-debug-keystore`.

### `-a <about.txt>`

Plaintext for the About screen. Optional; SAB has a default.

### `-ic <icon-path>` (repeatable)

App-icon PNG paths. SAB accepts standard Android density buckets and
scales missing densities. Supply at least 144×144 (xxhdpi) for production
quality; SAB scales down. Optional; SAB has a default.

### `-build-modern-pwa`

Enables SAB's modern-PWA build mode. v1 still produces an APK as the
primary artifact; PWA HTML output sits alongside the APK in the build
directory. v1.x can surface the PWA artifact through a separate R2 key.
Optional.

### `-fp build=<dir>`

Sets the file-path token `build` to the given scratch directory. SAB
writes the APK and intermediate files under this path. The Container
generates a fresh `<scratch>/build/...` per job and reads the APK from
there at the end.

---

## What lives outside this CLI surface

Several SAB capabilities are *not* exposed by v1:

- **Project loading (`-open`)** — see notes under `-new`.
- **Multiple bibles per app (`-add-book` / project-level composition)** —
  v1 builds one bible per APK. A multi-bible app is a v1.x extension
  to the payload schema, not a CLI-flag question.
- **Localized strings, custom fonts in the app, RTL configuration** —
  available in SAB GUI but not yet through `-new` flags. v1 inherits
  whatever defaults `-new` produces for the bible source's language.

The full SAB GUI surface is documented in the SIL "Building Apps" PDF
(see [Software SIL → Scripture App Builder](https://software.sil.org/scriptureappbuilder/)).
The CLI surface this article describes is a strict subset — what
`-new` accepts. As we surface more of the GUI's capabilities, this
article grows.

---

## Why we don't shell out the agent flags directly

Agents could in principle ship raw CLI flags in the payload. We don't
allow this for two reasons.

First, SAB's CLI is upstream's contract, not ours. Pinning the payload to
a structured schema means upstream can change flag names (`-ic` →
`--icon`) and the Container adapts; the payload stays stable.

Second, structured payloads are JCS-canonicalizable. Free-form CLI
strings are not — same logical request, different shell quoting,
different cache key.

If you find yourself wanting a flag that isn't in the schema, that is a
canon issue: open an article PR proposing the schema extension and the
flag mapping.

---

## Provenance

This article documents the CLI surface verified empirically from
`sillsdev/docker-appbuilder-agent`'s ansible priming command in
`ansible/roles/app-builders/tasks/main.yml`. The structural shape of the
article (flag-by-flag, "what lives outside") is forked from
`klappy://canon/articles/cli-reference` in ptxprint-mcp.
