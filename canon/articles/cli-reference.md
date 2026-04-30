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
  -i <additional-parameters-file> \
  [-a <about.txt>] \
  [-ic <icon-path>]... \
  [-build-modern-pwa] \
  -fp build=<scratch-build-dir> \
  -build
```

The `[ ]` brackets denote conditional flags. `-a`, `-ic`, and
`-build-modern-pwa` are emitted only when the payload has the corresponding
field populated (see `klappy://canon/articles/payload-construction`).

`-build` is **always** appended — without it, SAB only creates the project
on disk and exits without compiling. The
`sillsdev/docker-appbuilder-agent` priming script omits `-build`, which
is why session 5's first H-002 smoke found a 4-second silent exit; the
authoritative reference is the SIL "Building Apps" PDF §4.14 (page 37–38).

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

### `-build`

Triggers compilation. Used together with either `-new` or `-load`. The
SAB CLI's behavior without `-build` is "configure only, no build" —
SAB writes the project files, prints the parameter banner, and exits 0.
H-002 in session 5 surfaced this empirically; the priming script in
`sillsdev/docker-appbuilder-agent` exhibits the same shape, which is why
its "Prime gradle cache with build" step is commented out — it never
actually built anything.

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

### `-ks <keystore-path>`, `-ksp <store-password>`, `-ka <key-alias>`, `-kap <key-password>`

Signing material. The `-ks` argument is the Java keystore (`.keystore`).
Per SIL PDF page 38, the credential flags are separate:

- `-ks <filename>` — keystore file path
- `-ksp <password>` — keystore (store) password
- `-ka <alias>` — key alias inside the keystore
- `-kap <password>` — key (alias) password

In practice, SAB callers pass the credential flags via an additional-
parameters file referenced by `-i` (see below) rather than on the main
command line, so secrets do not appear in process args.

When `payload.keystore` is absent, the Container substitutes the bundled
debug keystore (env vars `APPBUILDER_DEBUG_KEYSTORE` and
`APPBUILDER_DEBUG_KEYSTORE_INFO`, set in the Dockerfile), where the info
file contains:

```
-ksp appbuilder-mcp-debug
-ka appbuilder-mcp-debug
-kap appbuilder-mcp-debug
```

See `klappy://canon/articles/bundled-debug-keystore`.

### `-i <additional-parameters-file>`

Loads additional CLI parameters from a file. The file format is one
flag per line, exactly as on the command line — e.g.

```
-ksp my-store-password
-ka my-key-alias
-kap my-key-password
```

This is **not** a Java-style key=value properties file. SAB silently
ignores lines that don't start with a recognized flag. The session-5
H-002 finding traced a "no APK produced" failure to a debug.properties
file written in `storePassword=...` form — SAB read it, saw no
recognized flags, and proceeded with no signing credentials.

The file is the canonical location for secrets so they don't appear in
container process listings.

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

Authoritative source: SIL "Building Apps" PDF §4.14 (page 37–38),
"Can I build an app from the command line?". The PDF documents `-new`,
`-load`, `-build`, `-no-save`, `-?`, `-n`, `-p`, `-b`, `-i`, `-a`, `-f`,
`-ic`, `-l`, `-ft`, `-vc`, `-vn`, `-ks`, `-ksp`, `-ka`, `-kap`, and
`-fp` and gives a worked example: `sab -new -n "My App" -p
com.example.myapp -b MyBookBundle.zip -f "Charis SIL Compact" -i
keys.txt –build`.

This article was originally written from the priming command in
`sillsdev/docker-appbuilder-agent`'s `ansible/roles/app-builders/tasks/
main.yml`. Session 5's H-002 first end-to-end smoke surfaced two bugs
that traced back to that priming script being itself non-functional:
(1) the priming command omits `-build`, so it never actually built
anything (the ansible role's "Prime gradle cache with build" step is
correctly commented out for that reason); (2) the canon article had
described `-i` as a "keystore-info" file in `key=value` form, when in
fact `-i` accepts an "additional parameters file" containing CLI flags
(per PDF page 37). The cli-reference now follows the PDF; the priming
script is preserved as a historical artifact, not an authority.

The structural shape of the article (flag-by-flag, "what lives outside")
is forked from `klappy://canon/articles/cli-reference` in ptxprint-mcp.
