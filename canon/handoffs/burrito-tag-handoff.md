---
uri: klappy://canon/handoffs/burrito-tag-handoff
title: "Container Handoff — Burrito-Capable Upstream Tag"
audience: "next-session-claude | container-maintainer | operator"
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "handoff", "container", "burrito", "scripture-burrito", "v1.1", "vodka-architecture"]
canonical_status: non_canonical
date: 2026-04-30
governs: "the Container-side change that lands burrito-format input support, completing the v1.1 input-shape ladder"
companion_to:
  - "canon/specs/appbuilder-mcp-v1-spec.md"
  - "canon/articles/payload-construction.md"
  - "canon/articles/cli-reference.md"
applied_canon:
  - "klappy://canon/principles/vodka-architecture"
  - "klappy://canon/principles/dry-canon-says-it-once"
  - "klappy://canon/principles/maintainability-one-person-indefinitely"
status: pending
---

# Container Handoff — Burrito-Capable Upstream Tag

> **One-line scope.** When the operator delivers the burrito-capable
> upstream tag of `ghcr.io/sillsdev/app-builders`, swap the Container
> base image and bump the payload schema to accept `bible_source.kind:
> "burrito_zip"`. This is a Container-only milestone — Worker code does
> not need to change.

---

## Trigger

The operator said during session 1: "I will get a tag to you in a bit
that can take a scripture burrito." This handoff lands the work that
becomes possible once that tag arrives.

The tag's content is unknown to us at handoff time. We assume:

- It exposes the same four CLI binaries
  (`scripture-app-builder`, `reading-app-builder`,
  `dictionary-app-builder`, `keyboard-app-builder`).
- The SAB CLI's `-b` flag accepts a burrito zip directly, or there is a
  new flag (e.g. `-burrito` or `-b-format=burrito`) that opts in.
- Existing USFM-zip and USX-zip inputs continue to work.

If any of these assumptions turn out wrong, surface honestly and revert
to planning. Do not paper over CLI surface changes.

---

## What changes

### Container

In `Dockerfile`:

```diff
- ARG APP_BUILDERS_TAG=latest
+ ARG APP_BUILDERS_TAG=<the burrito-capable tag>
  FROM ghcr.io/sillsdev/app-builders:${APP_BUILDERS_TAG} AS upstream
  ...
  FROM ghcr.io/sillsdev/app-builders:${APP_BUILDERS_TAG}
```

Pin the tag explicitly (e.g.
`ghcr.io/sillsdev/app-builders:burrito-2026.05`). Track the pin
discipline from `klappy://canon/articles/_archive/font-resolution-design`
(ptxprint-mcp) — bumping the base image is a deliberate change.

### Payload schema (`src/payload.ts`)

```diff
  const BibleSourceSchema = z.object({
-   kind: z.enum(["usfm_zip", "usx_zip"]),
+   kind: z.enum(["usfm_zip", "usx_zip", "burrito_zip"]),
    url: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  });

  export const PayloadSchema = z.object({
-   schema_version: z.literal("1.0"),
+   schema_version: z.union([z.literal("1.0"), z.literal("1.1")]),
    ...
```

Backwards-compatible: existing `1.0` payloads remain valid. New burrito
payloads declare `schema_version: "1.1"`.

### Container handler (`container/main.py`)

The CLI invocation block in `run_scripture_app_builder()` may need a
new flag depending on the upstream tag's surface. If the burrito tag
auto-detects burrito zips passed to `-b`, no code change is needed
beyond the type annotation:

```diff
- kind: str  # "usfm_zip" | "usx_zip"
+ kind: str  # "usfm_zip" | "usx_zip" | "burrito_zip"
```

If the burrito tag adds a new flag, update the command assembly:

```python
if payload.bible_source.kind == "burrito_zip":
    cmd += ["-burrito"]  # or whatever the upstream flag is
```

### Canon

- `canon/articles/payload-construction.md` — update the `bible_source.kind`
  enum and add a "burrito format" subsection.
- `canon/articles/cli-reference.md` — document the new flag or note
  auto-detection.
- `canon/specs/appbuilder-mcp-v1-spec.md` — bump the cited schema_version
  and add a §10 changelog entry.
- `canon/encodings/transcript-encoded-session-N.md` — encode the
  transition (D, O, L, C, H all relevant).

### What does not change

- Worker code (`src/index.ts`, `src/job-state-do.ts`, `src/container.ts`,
  etc.). The Worker is payload-shape-agnostic for `bible_source.kind`;
  the schema lives in `src/payload.ts` and the Worker passes payloads
  through.
- Cache discipline. Burrito payloads with new content hash fresh; old
  USFM/USX payloads retain their existing cache entries.
- The signing surface (bundled debug keystore + override) is unchanged.

---

## Validation steps

1. **Image pulls and runs.** `docker run --rm
   ghcr.io/sillsdev/app-builders:<tag> /bin/bash -c 'which
   scripture-app-builder'` returns a path.
2. **Existing fixture still builds.** Submit the canonical
   `eng-web_usfm.zip` fixture as `kind: "usfm_zip"`. Verify
   `failure_mode = "success"`.
3. **Burrito fixture builds.** Submit a burrito-format zip as
   `kind: "burrito_zip"`. Verify `failure_mode = "success"`.
4. **Cache miss → hit.** Resubmit the burrito payload byte-identical;
   verify `cached: true`.
5. **Encode in canon.** `transcript-encoded-session-N.md` with D for the
   tag pin, O for the validation evidence, H closing this handoff.

---

## Rollback

If the upstream tag has a regression, revert `Dockerfile`'s
`APP_BUILDERS_TAG` to `latest` (or the previous pin). The schema bump in
`src/payload.ts` is forward-compatible; leaving `burrito_zip` in the enum
while the Container can't service it is acceptable as long as the
Container surfaces a clear hard-failure log message ("burrito format
requires upstream tag X or later"). Don't strip the schema enum value
unless no payload has used it yet.

---

## Provenance

The handoff structure follows
`klappy://canon/handoffs/bundle-default-cfg-handoff` (ptxprint-mcp) —
specifically the "what changes / what does not / validation /
rollback" section pattern. The applied-canon list and the
companion-to discipline are inherited.

The change itself is AppBuilder-specific and depends on the upstream tag
the operator delivers. This handoff is the carrier; the actual transition
becomes a session of its own when the tag is in hand.
