---
title: "appbuilder-mcp Build Session — Work Log"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity"]
status: working
governs: "append-only ledger of build-session row closures, one entry per PR; complements docs/parity-matrix.md (status field) and docs/parity-spec.md (acceptance criteria)"
derives_from: "docs/agent-prompts/02-build-session.md §Per-gap loop step 5, docs/parity-spec.md §2 DoD"
---

# Build Session Work Log

> Append-only. One entry per PR. Newest at the top. Matrix row IDs come from
> `docs/parity-spec.md` §3–§5; matrix row text comes from
> `docs/parity-matrix.md`. The validator updates the matrix `status` to
> `closed` after acceptance — this log records what the build session shipped
> and the assumptions it carried.

---

## 2026-05-01T11:42Z — P1.7: Author `test/telemetry.test.ts`

- **Branch:** `feat/telemetry-tests` (branched from `origin/main` after PR #6 merge).
- **PR:** _to be appended once opened_
- **Spec criteria (§3 P1.7):** test file exists; ≥1 test per spec §6 DoD
  item (privacy floor, three-tier fallback, rate-limit, dataset-allowlist);
  each test pins the named DoD item with a comment quoting the spec line;
  `npm test` reports the new tests passing.
- **Files added/modified:**
  - `test/telemetry.test.ts` — **new**, 21 tests across five describe
    blocks: privacy floor (5), three-tier fallback (4), rate-limit (3),
    dataset-allowlist (7), forwardTelemetryQuery guard composition (2).
  - `docs/parity-matrix.md` — §3 Telemetry unit tests row → in_review.
- **Verification:**
  - `npm test` → `Test Files 2 passed (2) / Tests 34 passed (34)` (13
    payload from merged P1.1 + 21 new telemetry tests).
  - `npm run tsc` → clean exit.
- **Assumptions made (no operator):**
  - The v1 spec §6 mostly references ptxprint-mcp v1.3 §6 verbatim and
    documents the SAB-specific blob/double slot rebinding. The four
    operational DoD items (privacy floor, three-tier fallback, rate
    limit, dataset allowlist) live in the matrix §3 row text and the
    telemetry-governance canon doc; each describe block names which DoD
    item it pins and quotes the canonical phrasing.
  - Used `vi.fn()` for `globalThis.fetch` to test the three-tier
    knowledge_base path without making real network calls. Original
    `fetch` is restored in `afterEach` so the test isolates one request
    pattern at a time.
  - The forwardTelemetryQuery rate-limit test uses a 1/hr ceiling so the
    second call exceeds without making a real fetch; this is the
    cheapest way to assert the rate-limit guard fires before the
    network attempt.
- **Risks for the validator:**
  - The dataset-allowlist test "does not let comments smuggle in another
    dataset reference" verifies the current behavior: block-comment FROM
    is stripped, leaving no FROM in the residual query, which the
    detector rejects. If a future allowlist change accepts queries with
    no FROM, that test would flip — the desired behavior is "always
    require FROM appbuilder_telemetry," and the test pins that
    invariant.
  - `forwardTelemetryQuery` rate-limit test relies on the in-memory
    rate-limit map being shared across calls; `resetRateLimiter` is
    called in `beforeEach` so suites are independent. If the rate
    limiter ever moves to KV / DO, this test will need a different
    setup.

---

## 2026-05-01T11:42Z — P1.6: Author DEPLOY.md

- **Branch:** `feat/deploy-md` (branched from `origin/main` after PR #6 merge).
- **PR:** _to be appended once opened_
- **Spec criteria (§3 P1.6):** DEPLOY.md exists; secret walkthrough for
  CF_API_TOKEN, CF_ACCOUNT_ID, optional TELEMETRY_VERIFIED_CLIENTS and
  SNAPSHOT_BOOTSTRAP_TOKEN; R2 lifecycle policy (`wrangler r2 bucket
  lifecycle add` invocation); post-deploy verification (`curl /health`);
  production-keystore secret pattern with worked example; passes Writing
  Canon checklist (§2.1).
- **Files added/modified:**
  - `DEPLOY.md` — **new**, 9 sections (pre-deploy, secrets, R2 lifecycle,
    deploy, post-deploy, production keystores, updates, rollback,
    references). All required walkthroughs present.
  - `docs/parity-matrix.md` — §7 `DEPLOY.md` row → in_review.
- **Verification:**
  - DEPLOY.md is self-contained; the validator can follow it on a clean
    Cloudflare account end-to-end.
  - Title + blockquote summary + `## Summary — what you need before you
    deploy` + scannable headers + no buried claims (Writing Canon §2.1
    spirit; top-level repo docs follow the README/BUILD/ARCHITECTURE
    convention of no frontmatter — applying frontmatter only to canon
    articles).
- **Assumptions made (no operator):**
  - Treated `CF_ACCOUNT_ID` as a secret (matching current `wrangler.jsonc`
    secrets-block comment) and explicitly flagged the open P3.21 ADR
    inline. The doc tells operators what to do today and signals what
    will change when P3.21 closes; no operator action is required at
    that future point.
  - Mentioned `SNAPSHOT_BOOTSTRAP_TOKEN` as forthcoming (gates the future
    `POST /internal/snapshot/run` route from P2.10) so operators
    pre-set it if they like, without making it required.
  - The recommended R2 lifecycle (90-day expire on `outputs/`) matches
    Cloudflare Analytics Engine's retention window. Doc explicitly tells
    operators to adjust if their requirements differ — not a hard rule.
  - Used `wrangler r2 bucket lifecycle add` syntax. If the operator's
    wrangler version pre-dates that subcommand, the dashboard fallback
    is documented in §3.2.
- **Canon consulted:**
  - `wrangler.jsonc` — bindings, vars, secrets comment block.
  - `canon/articles/bundled-debug-keystore.md` (referenced from §6).
  - `canon/governance/telemetry-governance.md` (referenced from §6.3).
- **Risks for the validator:**
  - If `wrangler r2 bucket lifecycle add` syntax has changed in a recent
    wrangler release, §3.3's invocation may need a tweak. The dashboard
    fallback covers the regression. Easiest sanity check: validator runs
    the command on a fresh test bucket.
  - The "Workers Paid plan required" claim in §1 — the SAB container
    image (~1.7 GiB upstream) cannot run on the Workers Free plan; that
    is the load-bearing claim.

---

## 2026-05-01T11:35Z — P1.5: GET /diagnostics/schema (stacked onto the P1.2/P1.3/P1.4 cluster)

- **Branch:** `feat/telemetry-schema-source-of-truth` (same branch as the
  cluster — P1.5 has a hard dependency on P1.2, qualifying for shared-PR
  treatment under spec §6.1).
- **PR:** _amended into the same PR as P1.2/P1.3/P1.4_
- **Spec criteria (§3 P1.5):** GET /diagnostics/schema returns 200 +
  application/json + body equal to exportSchema(); PR body includes a curl
  transcript against a running instance.
- **Files added/modified:**
  - `src/diagnostics-schema-route.ts` — **new**, extracted route handler.
  - `src/index.ts` — dispatcher delegates to `handleDiagnosticsSchema`.
  - `test/diagnostics-schema.test.ts` — **new**, 6 tests covering 200,
    content-type, body equality, dataset+counts, and dispatcher
    fall-through behavior.
  - `docs/transcripts/...` — appended P1.5 synthetic-curl transcript and
    deferral note.
  - `docs/parity-matrix.md` — §6 `/diagnostics/schema` row → in_review.
- **Verification:** `npm test` → 39 passed (39); `npm run tsc` clean.
- **Assumptions made (no operator):**
  - Extracted the route handler to its own module so vitest can call it
    without resolving `cloudflare:*` / `agents/mcp` imports. Inline route
    handlers in `src/index.ts` cannot be unit-tested under Node's default
    ESM loader. Same pattern is used by ptxprint-mcp's `homepage.ts`,
    `snapshot.ts` etc., so this is canon-aligned.
  - Live `wrangler dev` curl transcript is deferred to the validator stage
    (no CF secrets in the build session); the vitest tests exercise the
    exact handler the dispatcher invokes.
- **Risks for the validator:**
  - The dispatcher fall-through (returning the route's null vs response) is
    new logic in `src/index.ts`. The "return null on non-matching" pattern
    keeps the route open for extension — additional sub-routes under
    `/diagnostics/*` can ship as separate handlers without restructuring.
---

## 2026-05-01T11:30Z — P1.2 + P1.3 + P1.4: telemetry-schema source-of-truth (coupled cluster)

- **Branch:** `feat/telemetry-schema-source-of-truth`
- **PR:** #7
- **Spec criteria:** §3 P1.2 (telemetry-schema.ts module API verbatim from
  ptxprint-mcp), §3 P1.3 (telemetry_schema MCP tool returns exportSchema()),
  §3 P1.4 (rewriteSemanticSql wired into forwardTelemetryQuery; rewriter
  test fixture covers all 5 spec-named cases plus idempotency).
- **Files added/modified:**
  - `src/telemetry-schema.ts` — **new**, mirrors ptxprint-mcp/src/telemetry-schema.ts @ 4271d70 verbatim. Dataset name and SAB-flavored descriptions (APK byte count, submit_build, SAB-unused legacy slots) are the only deltas.
  - `src/telemetry.ts` — `writeTelemetry` now uses `buildBlobsArray` / `buildDoublesArray`; scattered position comments removed. `forwardTelemetryQuery` applies `rewriteSemanticSql` before allowlist + forwards the rewritten body.
  - `src/index.ts` — registers the `telemetry_schema` tool; `telemetry_public` description advertises the rewriter and points at `telemetry_schema`; `/health` route lists 7 tools.
  - `test/telemetry-schema.test.ts` — **new**, 20 tests pinning blob/double positions, b()/d() output, buildBlobsArray/buildDoublesArray transposition resistance, and exportSchema() shape.
  - `test/telemetry-public-rewriter.test.ts` — **new**, 13 tests covering the 5 spec-named cases plus literal protection, idempotency, and schema-foreign identifier passthrough.
  - `docs/transcripts/feat-telemetry-schema-source-of-truth.md` — **new**, captures the exportSchema() JSON output and tool registration source as evidence in lieu of a live MCP transcript.
  - `docs/parity-matrix.md` — `status` updated for §1 telemetry_public + telemetry_schema, §2 telemetry.ts + telemetry-schema.ts, §3 schema-pinning tests rows.
- **Verification:**
  - `npm test` → `Test Files 2 passed (2) / Tests 33 passed (33)` (pre-rebase numbers; post-rebase the count includes the merged P1.1 payload tests).
  - `npm run tsc` → clean exit.
  - `npx tsx -e "import('./src/telemetry-schema.ts').then(m => console.log(JSON.stringify(m.exportSchema(), null, 2)))"` → captured at `docs/transcripts/feat-telemetry-schema-source-of-truth.md`.
- **Assumptions made (no operator):**
  - Mirrored ptxprint-mcp's module API verbatim — same 12 blob names + 10 double names + same helper signatures + same SQL-rewriter algorithm. The current appbuilder writer already used the same positional layout, so no AE data is rewritten in meaning.
  - Kept legacy PTXprint-specific double slots (`passes_completed`, `overfull_count`, `pages_count`) at their declared positions with deprecation-flavored descriptions. "Position is forever" — repurposing a slot would silently corrupt historical AE rows.
  - Wired `rewriteSemanticSql` to run BEFORE `validateDatasetAllowlist`. Order matters: the allowlist pattern matches against the post-rewrite text the AE will execute, so a schema name like `event_type` cannot smuggle through as if it were a dataset reference.
  - Did not run a live `wrangler dev` MCP transcript — that requires CF secrets the build session does not hold. Substituted a captured `exportSchema()` output plus the source registration as documented evidence in the transcript file.
- **Canon consulted:**
  - `klappy://canon/bootstrap/model-operating-contract` (session bootstrap).
  - `oddkit_preflight` (run before P1.1).
  - WebFetch of `klappy/ptxprint-mcp` @ 4271d70 `src/telemetry-schema.ts` for verbatim module-API mirroring.
- **Risks for the validator:**
  - **Latent bug (mirrored from ptxprint-mcp verbatim):** the rewriter's `\b<name>\b` regex is case-sensitive. `COUNT(*)` (upper) passes through unchanged. `count(*)` (lower) is incorrectly rewritten to `double1(*)` because `count` is a DOUBLE_SCHEMA field name. The `exportSchema()` notes already steer callers toward `SUM(_sample_interval)` rather than `COUNT(*)`, but lowercase `count(*)` will silently break. This same bug exists in ptxprint-mcp at the pinned reference SHA — not in spec §3 P1.4 acceptance, so left unfixed. Verbatim mirroring of the upstream module API is what the spec asked for; recommend a follow-up parity-spec-v2 row to harden the rewriter against function-name shadowing.
  - The `splitTopLevel` paren-depth walker assumes balanced parentheses. Malformed SQL with unbalanced parens may produce surprising splits, but those queries fail at the AE side anyway.
  - `forwardTelemetryQuery` no longer surfaces the original SQL in the result — the `query` field is the rewritten body. Callers debugging "why is my query odd" will want the post-rewrite text, which is what they get; intentional but worth documenting in `telemetry_public`'s tool description (already done).
---

## 2026-05-01T11:20Z — P1.1: Add `test/` directory and first test

- **Branch:** `feat/test-infra-payload`
- **PR:** _to be appended once opened_
- **Spec criteria (§3 P1.1):** `test/` exists; ≥1 `*.test.ts` exercises real
  production code; `npm test` reports non-zero passes and zero failures.
- **Files added:**
  - `test/payload.test.ts` — 13 tests across `PayloadSchema`, `canonicalize`,
    `payloadHash`.
- **Verification:** `npm test` → `Test Files 1 passed (1) / Tests 13 passed
  (13)`; `npm run tsc` → clean exit.
- **Assumptions made (no operator):**
  - Chose `src/payload.ts` as the first target because (a) it has clean unit
    boundaries (zod schema, pure canonicalize, async hash), (b) the matrix §3
    "Practical impact" note named payload-validation against fixtures as the
    smallest meaningful start, (c) it is load-bearing — the JCS canonicalization
    is the cache-key contract.
  - Used synthetic in-test payloads rather than parsing the binary fixtures in
    `fixtures/h009..h010-full`. Those fixtures are zip artifacts SAB consumes,
    not JSON payload fixtures; loading them would test fixture I/O rather than
    payload validation. A future row can add fixture-driven end-to-end tests.
  - Did not introduce a fixtures/payloads/*.json directory; per DoD principle
    "don't add abstractions beyond what the task requires" — one file, 13
    tests, all passing.
- **Canon consulted:**
  - `klappy://canon/bootstrap/model-operating-contract` (session bootstrap).
  - `oddkit_preflight` for "P1.1: Add test/ directory and first test".
- **Risks for the validator:**
  - The crypto.subtle digest path runs under Node 20+ (matches `engines` in
    `package.json`); if the validator runs against an older Node, the
    `payloadHash` tests will fail at runtime, not at the schema level.
  - Tests use `as const` casts on enum literals — if a future zod bump changes
    `z.literal` inference, the test cast site is the first place that breaks.

---
