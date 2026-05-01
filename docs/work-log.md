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
