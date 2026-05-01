---
title: "Build Session Work Log — feat/snapshot-mechanism"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.8", "P2.9", "P2.10", "P2.11"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for the P2.8/P2.9/P2.10/P2.11 coupled cluster; one file per PR per the SPEC-AMENDMENT-shared-state-conflicts pattern"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4"
---

# 2026-05-01 — P2.8 + P2.9 + P2.10 + P2.11: Track A snapshot mechanism (coupled cluster)

- **Branch:** `feat/snapshot-mechanism`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.8 / P2.9 / P2.10 / P2.11):**
  - P2.8: `src/snapshot.ts` exists; exports `runSnapshot`, `runSnapshotForWeeks`, `mergeSnapshots`, JSONL helpers, `getLifetimeHeroStat`, `METRICS`. Module API matches `klappy/ptxprint-mcp/src/snapshot.ts` @ `4271d70`. METRICS has ≥4 SAB-equivalent metric definitions. `tsc --noEmit` passes.
  - P2.9: `wrangler.jsonc` declares `TELEMETRY_SNAPSHOTS` R2 binding (bucket `appbuilder-telemetry-snapshots`) and `triggers.crons: ["0 0 * * 1"]`.
  - P2.10: `POST /internal/snapshot/run` exists in `src/index.ts`, gated by `SNAPSHOT_BOOTSTRAP_TOKEN` (rejects 401/503 without it).
  - P2.11: `test/snapshot.test.ts` covers date helpers, JSONL round-trip, merge-by-key idempotency, week-boundary correctness; subtests name which export they exercise.

- **Files added/modified:**
  - `src/snapshot.ts` — **new** (~580 LOC). Mirrors ptxprint-mcp's module API verbatim. SAB deltas: dataset is `appbuilder_telemetry`; tool_name filter is `submit_build`; hero metric is `apk_bytes_weekly` (sum of `double4 = bytes_out`) instead of `pages_typeset_weekly`. METRICS table: `total_builds_weekly`, `successful_builds_weekly`, `failure_mode_distribution_weekly`, `apk_bytes_weekly`.
  - `src/snapshot-route.ts` — **new**. `handleSnapshotRun(req, env, options)` returns a `Response` for `POST /internal/snapshot/run` or `null` for fall-through. Token gate: requires `SNAPSHOT_BOOTSTRAP_TOKEN` env secret AND a matching `x-snapshot-token` header or `body.token` field. Extracted to its own module so it stays unit-testable without `cloudflare:*` imports.
  - `src/index.ts` — Env adds `TELEMETRY_SNAPSHOTS` and optional `SNAPSHOT_BOOTSTRAP_TOKEN`; dispatcher delegates to `handleSnapshotRun`; new `scheduled` handler runs `runSnapshot` for the previous week on the weekly cron.
  - `wrangler.jsonc` — TELEMETRY_SNAPSHOTS R2 binding + `triggers.crons: ["0 0 * * 1"]` + secrets-block updated with `SNAPSHOT_BOOTSTRAP_TOKEN`.
  - `test/snapshot.test.ts` — **new**, 32 tests across 9 suites: weekStartFor (4), toIsoDate/addDays (2), lastNWeekStarts (2), parseJsonl/serializeJsonl (4), mergeSnapshots (6), METRICS sanity (3), runSnapshot integration (3), runSnapshotForWeeks (1), handleSnapshotRun (7).
  - `docs/transcripts/feat-snapshot-mechanism.md` — **new**, captures the route's accept/reject transcripts.

- **Verification:**
  - `npm test` → `Test Files 2 passed (2) / Tests 45 passed (45)` (13 payload from merged P1.1 + 32 snapshot).
  - `npm run tsc` → clean exit.
  - `npx tsx` synthetic transcript captured (see `docs/transcripts/feat-snapshot-mechanism.md`).

- **Assumptions made (no operator):**
  - **Bookkeeping pattern:** following `BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md`, this PR uses a per-PR work-log file at `docs/work-log/feat-snapshot-mechanism.md` and does NOT edit `docs/parity-matrix.md`. Operator implicitly accepted by saying "continue." Validator owns the matrix `status: open → in_review → closed` transitions on accept.
  - **METRICS choice:** spec §4 P2.8 calls for "at least four" metrics covering "build count, success rate, failure-mode distribution, lifetime cumulative." Mapped as: `total_builds_weekly` (build count), `successful_builds_weekly` (combined with #1 → success rate), `failure_mode_distribution_weekly` (per-mode), `apk_bytes_weekly` (lifetime hero stat). Storing successful + total separately rather than a derived ratio metric — consumers compute the ratio.
  - **Hero stat:** `apk_bytes` rather than `pages_count` (PTXprint's hero stat). The PTXprint slot `double10 = pages_count` is reserved with no APK analog (see `src/telemetry-schema.ts` description). `double4 = bytes_out` doubles as APK byte count for `job_terminal success`, which is the SAB equivalent of "lifetime work delivered."
  - **Token gate model:** match either `x-snapshot-token` header OR `body.token` JSON field. Header is the conventional pattern; body field is for callers who can't easily set headers (e.g. a quick `curl --data` test). 401 on mismatch, 503 on env missing — distinguishable.
  - **Cron handler:** runs against `addDays(weekStartFor(now), -7)` so a Monday 00:00 UTC trigger snapshots the just-completed week. Uses `ctx.waitUntil` so the trigger returns promptly while the snapshot runs in the background.
  - **Hardcoded blob/double positions in METRICS SQL** — same pattern as ptxprint-mcp. `b()` / `d()` helpers from `src/telemetry-schema.ts` would have introduced a hard dependency on PR #7 (telemetry-schema module). Hardcoded refs are checked by the schema-pinning test in `test/telemetry-schema.test.ts` (lands when PR #7 merges) — if positions ever drift, the test breaks first; this module's SQL must be updated in lockstep.

- **Canon consulted:**
  - WebFetch + curl of `klappy/ptxprint-mcp/src/snapshot.ts` @ `4271d70` (verbatim mirror of module API).
  - `klappy://canon/articles/hero-metrics-and-storytelling` (referenced in module docstring; SAB version is row P2.16, separate PR).
  - `klappy://canon/governance/telemetry-governance` (data contract).

- **Risks for the validator:**
  - **Hardcoded blob/double positions in SQL:** the METRICS SQL templates use `blob1`, `blob3`, `blob8`, `double4` directly. ptxprint-mcp does the same. The schema-pinning test (PR #7) catches drift — if PR #7 hasn't merged yet, this PR ships without the explicit pinning. Validator should confirm position references match the (forthcoming or merged) `BLOB_SCHEMA` / `DOUBLE_SCHEMA` constants.
  - **Cron handler in-flight:** `scheduled` is wired but cannot be smoke-tested without a deployed worker. The vitest `runSnapshot` integration test exercises the same code path (mocked R2 + AE). A live cron firing is a validator-stage check.
  - **R2 bucket creation:** the bucket `appbuilder-telemetry-snapshots` doesn't exist until first deploy. `wrangler deploy --dry-run` should still succeed (the binding is declared), but the first scheduled run after deploy will lazily create the bucket on first `put`.
  - **`src/snapshot-route.ts` body parsing:** a malformed JSON body silently becomes `{}` (caught try/catch). This means a POST with `Content-Type: text/plain` and a token in the header still works as long as the header is present. By design — failing closed on body parse would block valid header-token requests.
