---
uri: klappy://canon/governance/telemetry-governance
title: "Telemetry Governance — What appbuilder-mcp Tracks and Why"
audience: project
exposure: nav
voice: instructional
stability: working
tags: ["canon", "governance", "constraint", "telemetry", "transparency", "privacy", "vodka-architecture", "maintainability", "analytics-engine", "appbuilder", "mcp", "v1-aligned", "appbuilder_telemetry"]
date: 2026-04-30
derives_from: "klappy://canon/governance/telemetry-governance (ptxprint-mcp — same governance pattern, AppBuilder slot rebinding documented), klappy://canon/constraints/telemetry-governance (klappy.dev / oddkit)"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/failure-mode-taxonomy.md"
canonical_status: canonical
governs: "All telemetry collection in the appbuilder-mcp server (Worker + Container + Durable Objects + R2)"
status: draft_pending_fresh_review
---

# Telemetry Governance — What appbuilder-mcp Tracks and Why

> The appbuilder-mcp server runs Scripture App Builder jobs that produce
> APKs for Bible-translation contexts. Each job costs real Container
> minutes and produces artifacts that belong to translation teams
> operating in sensitive environments. Telemetry exists so the maintainer
> can make informed decisions about cache effectiveness, failure mix, and
> where time goes — never to identify which team is doing what work. The
> system tracks the **shape** of usage; it never records the
> **substance**. The data is public. If you wouldn't show a translator
> the dashboard showing what they did, you shouldn't be collecting that
> data.

---

## Provenance and scope

This governance document is structurally forked from the proven pattern
in `klappy://canon/governance/telemetry-governance` (ptxprint-mcp), which
was itself forked from oddkit's hosted-service pattern at
`klappy://canon/constraints/telemetry-governance` (klappy.dev). The
fork-and-derive lineage means three things:

1. **The privacy floor is identical** to ptxprint-mcp's. App identity
   (name, package) is treated as content. Bible-source URLs, icon URLs,
   keystore URLs, log content, APK bytes — none of these enter the
   telemetry surface.
2. **The five operational questions are identical in shape** but
   AppBuilder-tuned: adoption, cache effectiveness, failure mix, where
   time goes within a build, and which canon docs the `docs` tool serves.
3. **The slot bindings differ** — see "Slot rebinding from ptxprint-mcp"
   below. The Cloudflare Analytics Engine schema preserves the slot
   names (`sources_count`, `fonts_count`, `figures_count`, etc.) so
   dashboards portable from ptxprint-mcp keep parsing; the AppBuilder
   meanings are documented here.

The `status: draft_pending_fresh_review` reflects that this document has
not yet had a context-break review per
`klappy://canon/principles/verification-requires-fresh-context`. It is
operationally adequate for v0.1 but should not be treated as
canon-tier-1 until reviewed.

---

## Privacy Floor — What Is Never Logged

This section leads, not trails, the rest of the document.

### App identity (treated as content)

- **App name** (`payload.name`)
- **Package name** (`payload.package`)
- **Bible source URLs** (`payload.bible_source.url`) and any other
  caller-supplied URLs
- **Icon filenames** beyond their count

### Content

- **Bible USFM/USX bytes**
- **Payload contents** beyond structural counts and the
  `payload_hash_prefix` pseudonym
- **Keystore bytes or info-file contents** (the keystore is
  authentication material; it should never enter telemetry)
- **APK bytes**
- **SAB log content**
- **`docs` tool query strings** — natural-language questions are content

### Caller identity beyond opt-in

- **IP addresses, fingerprints, auth tokens** — never logged
- **User account IDs beyond the self-declared `consumer_label`**

### Pseudonymous boundary

The single pseudonymous dimension is `payload_hash_prefix` — the **first
8 hex characters** of the sha256 of the canonical payload JSON. Never the
full hash. Never any field of the payload itself. Two teams building the
same public Bible APK (e.g. eng-web) will share a prefix; this collision
is privacy-positive and intentional.

The principle: if a field reveals **who** is doing the work or **what
specific app** they are building, it is excluded. If it reveals **how
much** work happened, **how long** it took, or **what shape** it was, it
is included.

---

## What Is Tracked

Two event classes, identical to ptxprint-mcp's pattern:

- **MCP-side events** — `mcp_request` per JSON-RPC envelope; additional
  `tool_call` for `tools/call` methods.
- **Job-lifecycle events** — `job_phase` at each phase transition;
  `job_terminal` once per dispatched job.

All writes go to the `appbuilder_telemetry` Cloudflare Workers Analytics
Engine dataset via `env.APPBUILDER_TELEMETRY.writeDataPoint()`. Writes
are non-blocking and add zero latency to request handling.

### Structural Dimensions (Blobs)

| # | Field | Populated For | Example |
|---|---|---|---|
| 1 | `event_type` | all | `mcp_request \| tool_call \| job_phase \| job_terminal` |
| 2 | `method` | mcp_request, tool_call | `tools/call`, `initialize` |
| 3 | `tool_name` | mcp_request, tool_call | `submit_build \| get_job_status \| cancel_job \| docs \| telemetry_public \| telemetry_policy` |
| 4 | `consumer_label` | all | `claude-desktop`, `bt-servant`, `unknown` |
| 5 | `consumer_source` | all | `header \| query \| client_info \| user_agent \| oauth` |
| 6 | `worker_version` | all | `0.1.0` |
| 7 | `phase` | job_* | `queued \| fetching_inputs \| building \| signing \| uploading \| done` |
| 8 | `failure_mode` | job_terminal | `success \| soft \| hard \| cancelled \| timeout` |
| 9 | `cache_outcome` | mcp_request (when `tool_name = submit_build`) | `hit \| miss \| n/a` |
| 10 | `payload_hash_prefix` | submit_build, job_* | first 8 hex chars only |
| 11 | `docs_audience` | docs | `headless \| gui` |
| 12 | `docs_top_uri` | docs | `klappy://canon/...` URI of the top hit |

Phase enum for `job_phase` is AppBuilder-tuned:

1. `queued` — Worker has dispatched; Container has not picked up yet
2. `fetching_inputs` — Container parallel-fetching bible source, icons,
   about, keystore
3. `building` — SAB CLI running (the Android-toolchain heavy lift)
4. `signing` — APK signing pass (often part of `building`; broken out
   when SAB exposes a distinct signing log section)
5. `uploading` — Container PUT'ing APK and log to R2
6. `done` — terminal phase, Container releasing the job

### Numeric Values (Doubles)

| # | Value | What It Records |
|---|---|---|
| 1 | `count` | always `1`, for SUM aggregation |
| 2 | `duration_ms` | wall-clock at the layer that wrote the event |
| 3 | `bytes_in` | for `mcp_*`: JSON-RPC request body bytes; for `submit_build`: payload size |
| 4 | `bytes_out` | for `mcp_*`: response body bytes; for `job_terminal` success: APK byte count |
| 5 | `sources_count` | **rebound to: number of icons in payload** |
| 6 | `fonts_count` | **rebound to: 1 if caller-supplied keystore, else 0** |
| 7 | `figures_count` | **rebound to: 1 if `-build-modern-pwa`, else 0** |
| 8 | `passes_completed` | reserved (no AppBuilder analog yet) |
| 9 | `overfull_count` | reserved (no AppBuilder analog) |
| 10 | `pages_count` | reserved (no APK analog) |

### Slot rebinding from ptxprint-mcp

ptxprint-mcp's `sources_count` / `fonts_count` / `figures_count` describe
typesetting inputs (USFM books, font URLs, figure URLs). AppBuilder's
schema doesn't have those notions; rather than introduce new AE slots
(which would deprecate slots for downstream consumers, the same way
oddkit's slot-9 was deprecated when `cache_tier` was retired — see
`klappy://canon/constraints/telemetry-governance`), we rebind:

| AE slot | ptxprint-mcp meaning | appbuilder-mcp meaning |
|---|---|---|
| `sources_count` | USFM source count | icon count |
| `fonts_count` | font URL count | 1 if `payload.keystore` present, else 0 |
| `figures_count` | figure URL count | 1 if `payload.build_modern_pwa`, else 0 |

This rebinding is documented in `canon/specs/appbuilder-mcp-v1-spec.md`
§6 and in the inline comment in `src/index.ts` next to the assignment.
Dashboards portable from ptxprint-mcp will see populated slots; their
labels are the only thing requiring adjustment for AppBuilder context.

Reserved slots (`pages_count`, `overfull_count`, `passes_completed`)
stay empty per Schema Hygiene. New AppBuilder-specific slots will be
added by editing this document and shipping the corresponding Worker
change — never speculatively.

---

## Job Lifecycle Events

Same Container-emits-via-Worker pattern as ptxprint-mcp (the Container
holds **no** Cloudflare credentials). Container POSTs envelopes to
`/internal/telemetry`; Worker validates against
`redactAndValidate()` and writes to AE.

Routing constraint: direct Container-to-AE writes are explicitly rejected
until the forward path is shown to bottleneck. None observed.

---

## Three-Tier Policy Resolution

`telemetry_policy` returns this document, but does not hardcode it. The
tool resolves through the three-tier fallback chain (mirrors oddkit's
pattern verbatim):

1. **`knowledge_base`** — fetch this document live from
   `klappy/appbuilder-mcp` via the canon retrieval path. Primary source.
2. **`bundled`** — if canon fetch fails, serve the deploy-time bundled
   copy at `src/bundled-policy.ts`. Slightly stale by definition; never
   silently misleading.
3. **`minimal`** — if even the bundled copy is missing, return a
   one-paragraph minimal policy listing the dataset name, the
   privacy-floor non-negotiables, and a pointer to this document's URI.

Every `telemetry_policy` response includes the `governance_source` field,
so a consumer can tell which tier served their copy and how stale it
might be.

---

## Consumer Identification (mirrors ptxprint-mcp)

Resolution priority:

1. `?consumer=` query parameter (URL-level, highest priority)
2. `x-appbuilder-client` header (explicit)
3. MCP `initialize` → `clientInfo.name` (protocol-native)
4. `User-Agent` header (fallback)
5. `"unknown"` (default)

### Self-Report Headers

| Field | Header |
|---|---|
| Client name | `x-appbuilder-client` |
| Client version | `x-appbuilder-client-version` |
| Agent name | `x-appbuilder-agent-name` |
| Agent version | `x-appbuilder-agent-version` |
| Surface | `x-appbuilder-surface` |
| Contact URL | `x-appbuilder-contact-url` |
| Policy URL | `x-appbuilder-policy-url` |
| Capabilities | `x-appbuilder-capabilities` |

Verified clients (env `TELEMETRY_VERIFIED_CLIENTS`) receive weighted
leaderboard scoring.

---

## Vodka Architecture Compliance

Same three-question test as ptxprint-mcp, same answers in spirit:

1. **Has the server grown thick?** No. One `writeDataPoint()` per
   request, plus the `/internal/telemetry` forwarding endpoint.
2. **Has the server acquired domain opinions?** `failure_mode` and
   `phase` are AppBuilder-shaped enums. They are already in the
   `get_job_status` response surface, so logging them does not move the
   vodka line.
3. **Can the server be removed without consequence?** No. Cache hit
   rate, failure mix, and `docs` tool serving distribution drive
   prioritization decisions for a single-maintainer system.

---

## Query Security (`telemetry_public`)

Same three guards as ptxprint-mcp:

1. **Dataset allowlist** — queries must target `appbuilder_telemetry`
   only. Cross-dataset references are rejected before reaching AE.
2. **Rate limiting** — per consumer label, protecting the AE 10K-queries-per-day
   free quota.
3. **Error sanitization** — raw AE errors (which may leak account
   internals) are converted to generic failure messages.

The data is public, the API token is read-only. The threat model is
resource exhaustion, not data exfiltration.

---

## Schema Hygiene

The schema in this document IS the canonical schema. New slots are added
by:

1. Editing this document to define the slot.
2. Shipping the corresponding Worker change.
3. (Optional) Backfilling canned-query examples.

Speculative empty slots reproduce the slot-9 deprecation problem (see
`klappy://canon/constraints/telemetry-governance` §"retired" note on
`cache_tier`). Don't anticipate.

---

## See Also

- `klappy://canon/specs/appbuilder-mcp-v1-spec` — what this telemetry observes.
- `klappy://canon/articles/failure-mode-taxonomy` — the source of the
  `failure_mode` enum.
- `klappy://canon/governance/telemetry-governance` (ptxprint-mcp) — the
  upstream pattern this article forks.
- `klappy://canon/constraints/telemetry-governance` (klappy.dev /
  oddkit) — the original pattern.
- `klappy://canon/principles/vodka-architecture` (klappy.dev) — the
  design discipline this article serves.
- `klappy://canon/principles/verification-requires-fresh-context`
  (klappy.dev) — why this article carries `status:
  draft_pending_fresh_review`.
