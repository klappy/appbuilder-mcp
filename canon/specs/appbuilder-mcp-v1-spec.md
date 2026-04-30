---
uri: klappy://canon/specs/appbuilder-mcp-v1-spec
title: "AppBuilder MCP Server — v1 Specification"
subtitle: "Stateless content-addressed APK building on Cloudflare Workers + Containers"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "spec", "v1", "vodka-architecture", "cloudflare", "scripture-app-builder"]
version: v1.0-draft
date: 2026-04-30
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
derives_from: "klappy://canon/specs/ptxprint-mcp-v1-2-spec, klappy://canon/specs/ptxprint-mcp-v1-3-spec"
governs: "the appbuilder-mcp Worker + Container build for v1.x (May 2026+)"
status: draft_for_review
---

# AppBuilder MCP Server — v1 Specification

> Build Scripture App Builder APKs from inputs an agent already has, without
> the agent needing to know about Android SDKs, JDK, Gradle, or signing.
> Content-addressed cache means resubmitting the same payload is free.
>
> **Provenance.** This spec is structurally derived from the ptxprint-mcp v1.2
> and v1.3 specs. The architectural envelope (one Worker, one Container, six
> tools, content-addressed cache, two-step async, three failure modes) is
> identical. The differences are isolated to the payload schema, the
> CLI invocation, the artifact type (APK), and the bundled-asset (debug
> keystore instead of default cfg).

---

## §1 — Scope

### v1.0 in scope

- Scripture App Builder (SAB) only. RAB / DAB / KAB are out of scope for v1.0
  and tracked as v1.x increments.
- APK output only. AAB / IPA / PWA are out of scope for v1.0; PWA is the
  closest add (single SAB flag) and is the natural v1.1 candidate.
- Bible source as USFM zip or USX zip (the SAB CLI's `-b` argument; the
  binaries originate in `ghcr.io/sillsdev/app-builders` and are
  shipped at runtime through the SIL `appbuilder-agent-prd` image we
  layer on). Scripture burrito support arrives as a Container-only swap
  once the burrito-capable upstream tag is delivered (see
  `klappy://canon/handoffs/burrito-tag-handoff`).
- Bundled debug keystore as the Phase-0 floor. Caller can override with
  payload-supplied keystore. See
  `klappy://canon/articles/bundled-debug-keystore`.
- Six MCP tools: `submit_build`, `get_job_status`, `cancel_job`, `docs`,
  `telemetry_public`, `telemetry_policy`.

### v1.0 out of scope

- Multiple builder types (RAB / DAB / KAB).
- Non-APK output (AAB / IPA / PWA).
- Mid-build cancellation (the SAB CLI does not currently support clean
  interruption; the cancel flag is recorded but the build runs to
  completion).
- Production keystore management beyond "caller supplies via payload."
- Burrito-format inputs (deferred to the burrito-capable upstream tag).

---

## §2 — Core ideas (inherited from ptxprint-mcp)

**Scripture App Builder as a pure function.** The system treats
`SAB(name, package, bible, keystore, branding) -> APK` as deterministic.
Same inputs → same output. Output is content-addressed by
`sha256(canonical_payload)`. Re-submitting an unchanged payload returns the
cached R2 URL with no SAB run.

**Stateless containers.** No project tree on the server. Every job is a
self-contained submission; the Container materializes a scratch directory
at job start, runs, and the disk is wiped on Container sleep. Any Container
instance is interchangeable with any other.

**Project state is the agent's responsibility.** USFM sources, fonts,
icons, keystores — wherever they live (local filesystem, Git, DBL,
Paratext server) — are accessed by the agent through whatever its
environment provides. The build MCP only sees the payload.

**Inline metadata, URL'd binaries.** The payload contains app identity
(name, package, build flags) inline. Bible sources, icons, about file, and
keystore are referenced by URL with sha256 verification. Hosting those URLs
is the agent's concern.

**Two-step async.** Every build call returns a `job_id` immediately. Status
is polled via `get_job_status`. No MCP call blocks for more than a few
seconds.

**Three failure modes, not two.** Exit code zero plus an APK is necessary
but not sufficient for success. See
`klappy://canon/articles/failure-mode-taxonomy`.

---

## §3 — Tool surface

### `submit_build(payload) → { job_id, predicted_apk_url, cached, payload_hash }`

Validates the payload (zod schema in `src/payload.ts`), computes
`sha256(canonical_payload)` per RFC 8785 JCS, checks R2 for a cached APK at
`outputs/<hash>/<package>_<sanitized-name>_appbuilder.apk`. On hit, returns
the cached URL with `cached: true`. On miss, initializes a JobStateDO,
dispatches to the AppbuilderContainer DO, and returns `cached: false` with
the predicted URL.

The `job_id` is the payload hash itself. This gives free idempotency at
the DO layer — concurrent submits of the same payload converge on the
same DO instance.

### `get_job_status(job_id) → JobState`

Reads the JobStateDO. Returns the full state object: `state`, `progress`,
`failure_mode`, `apk_r2_key`, `log_r2_key`, `apk_url`, `log_url`,
`exit_code`, `errors`, `human_summary`, `submitted_at`, `started_at`,
`completed_at`. URLs are derived from R2 keys via the Worker's `/r2/`
proxy.

### `cancel_job(job_id) → { ok, was_running, cancelled_at, note }`

Sets `cancel_requested: true` on the JobStateDO. v0.1 PoC: the flag is
recorded; the SAB CLI does not currently support mid-build cancellation,
so the build runs to completion. Surfacing this honestly via the `note`
field is preferred to silently dropping the request.

### `docs(query, audience?, depth?) → DocsResult`

Thin proxy to oddkit MCP for in-repo canon retrieval, pinned to this
repo's knowledge base
(`https://github.com/klappy/appbuilder-mcp`). Same surface and semantics
as ptxprint-mcp's `docs` tool. See
`klappy://canon/encodings/transcript-encoded-session-13` (in ptxprint-mcp)
for the Shape A vs. Shape B retrieval discussion.

### `telemetry_policy() → governance text + source tier`

Returns the current telemetry policy from
`canon/governance/telemetry-governance.md` via three-tier fallback
(knowledge_base → bundled → minimal). Same pattern as ptxprint-mcp v1.3.

### `telemetry_public(sql) → AE query result`

Forwards arbitrary read-only SQL to Cloudflare Analytics Engine, scoped to
the `appbuilder_telemetry` dataset. Rate-limited per consumer.

---

## §4 — Payload schema

See `src/payload.ts` for the zod definition of record. Authoritative fields:

```
{
  schema_version: "1.0",        // literal
  name: string,                 // 1..64
  package: string,              // Java reverse-DNS, e.g. "org.ebible.web"
  bible_source: {
    kind: "usfm_zip" | "usx_zip",
    url: string,                // https
    sha256: string              // 64 hex
  },
  about_url?: string,           // optional; SAB falls back to default
  about_sha256?: string,        // required iff about_url is present
  icons: [
    { filename: string, url: string, sha256: string }
  ],                            // [] is valid; SAB falls back to default
  keystore?: {
    keystore_url: string,
    keystore_sha256: string,
    info_url: string,
    info_sha256: string
  },                            // omitted → bundled debug keystore
  build_modern_pwa: boolean     // default false; v0.1 still produces APK
}
```

**Canonical payload** for hashing follows RFC 8785: object keys in
lexicographic order, no whitespace, smallest valid JSON form for primitives.

**Burrito-capable extension** (per
`klappy://canon/handoffs/burrito-tag-handoff`): once the upstream tag is
delivered, `bible_source.kind` adds `"burrito_zip"`. This is a
strict-extension schema bump (`schema_version: "1.1"`) — old `1.0`
payloads remain valid.

---

## §5 — Container

- **Image:** built from `./Dockerfile` at deploy time. FROM
  `ghcr.io/sillsdev/appbuilder-agent-prd:${APP_BUILDERS_TAG}` (default
  `latest`; bump to the burrito-capable tag when delivered). The
  agent-prd image is the operator-tested SAB runtime — phusion/baseimage
  + ansible-installed Android SDK + JDK + Gradle + the four SAB shell
  scripts symlinked into `/usr/local/bin/`. The bare
  `ghcr.io/sillsdev/app-builders` image is a builder-stage carrier with
  no shell and cannot be used as a runtime FROM base; see
  `klappy://canon/encodings/transcript-encoded-session-3` for the
  empirical confirmation and revision of session-1 D-002.
- **Instance type:** `standard-3` (1/2 vCPU, 12 GiB RAM, 20 GB disk). The
  Android toolchain is materially heavier than PTXprint's TeX install;
  this is the smallest CF Container size that comfortably fits the SDK +
  JDK + Gradle cache + scratch space.
- **Sleep window:** 60 minutes. A first build is the worst case (no Gradle
  cache); subsequent builds in the warm window are fast.
- **Max instances:** 2 for v0.1 (cost control). Bump as load demands.
- **HTTP handler:** FastAPI at port 8080. `POST /jobs` runs end-to-end and
  returns when the build finishes. State patches and artifact uploads flow
  back through the Worker via `worker_callback_url`.

The Container holds **no** Cloudflare credentials. All R2 writes and
JobStateDO updates go through the Worker.

---

## §6 — Telemetry

Mirrors ptxprint-mcp v1.3 telemetry. See
`canon/governance/telemetry-governance.md` for what is tracked, what is
excluded, and why. Privacy floor for AppBuilder is identical to PTXprint
in spirit: app identity (name, package) is treated as content and never
logged; structural counts are public.

Slot rebinding from PTXprint's schema (preserves AE blob compatibility):

| AE slot | PTXprint meaning | AppBuilder meaning |
|---|---|---|
| `sources_count` | number of USFM source URLs | number of icon URLs |
| `fonts_count` | number of font URLs | 1 if caller-supplied keystore, else 0 |
| `figures_count` | number of figure URLs | 1 if `-build-modern-pwa`, else 0 |
| `pages_count` | PDF page count | (reserved; no APK analog) |
| `overfull_count` | XeTeX overfull warnings | (reserved) |

Slot names retained verbatim so dashboards portable from ptxprint-mcp
keep parsing. Documenting the rebinding here is the canonical record.

---

## §7 — Failure modes

Three: `hard`, `soft`, `success`. See
`klappy://canon/articles/failure-mode-taxonomy`. v0.1 classifier is in
`container/main.py:classify_failure()` and uses a small set of soft-marker
strings in the SAB log (`BUILD FAILED`, `WARNING: Failed to sign`).
Refining the classifier is a v0.x task as we accumulate observed
failure-log corpora.

---

## §8 — Definition of Done (v1.0)

Pipeline-validation milestone (mirrors ptxprint-mcp Phase-1 PoC discipline):

1. **End-to-end build.** A payload of `{name, package, bible_source}`
   (everything else defaulted) submitted via `submit_build` produces a
   signed-with-debug APK reachable at `predicted_apk_url` within the
   sleepAfter window.
2. **Cache hit.** Re-submitting the same payload returns
   `cached: true` with no new Container run.
3. **Job status reflects reality.** `get_job_status` returns
   state transitions queued → running → succeeded with
   `failure_mode = "success"` and a non-empty `apk_r2_key`.
4. **Soft-failure detection.** A deliberately broken payload (e.g.
   keystore mismatch) classifies as `soft` or `hard` correctly, with
   `log_tail` populated.
5. **Documented.** A canon `transcript-encoded-session-2.md` exists,
   capturing the validation evidence and any incidents that surfaced.

A successful end-to-end build with the bundled debug keystore against the
ansible-priming `eng-web_usfm.zip` fixture is the canonical first
validation target — same fixture
`sillsdev/docker-appbuilder-agent` already uses to prime its own image.

---

## §9 — Where to read next

- `klappy://canon/articles/payload-construction` — payload-by-example.
- `klappy://canon/articles/cli-reference` — the underlying SAB CLI surface.
- `klappy://canon/articles/bundled-debug-keystore` — the Phase-0 signing
  floor.
- `klappy://canon/handoffs/burrito-tag-handoff` — the next concrete
  container-side milestone.
- `klappy://canon/encodings/transcript-encoded-session-1` — the bootstrap
  session journal.
