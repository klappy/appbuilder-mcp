---
title: "Validation Findings — PR #9 (P1.7 telemetry unit tests)"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["validation", "parity", "telemetry-tests", "fresh-context"]
status: working
governs: "Disposition for PR #9 against docs/parity-spec.md §3 P1.7. Validator-bound by spec §8."
derives_from: "docs/agent-prompts/03-validator-session.md, docs/parity-spec.md §3 P1.7, klappy://canon/validation-as-epistemic-mode"
---

# Validation — PR #9 against parity-spec.md §3 P1.7

> Fresh-context review per `klappy://canon/principles/verification-requires-fresh-context`. Validator did not author the PR. Mode: validation.

## Spec rows under review

- **P1.7** — Author `test/telemetry.test.ts` (matrix §3 row "Telemetry unit tests")

## Acceptance criteria (verbatim from `docs/parity-spec.md` §3 P1.7)

- `test/telemetry.test.ts` exists with at least one test per spec §6 DoD item (privacy floor, three-tier fallback, rate-limit, dataset-allowlist).
- Each test pins one named DoD item from `canon/specs/appbuilder-mcp-v1-spec.md` §6 with a comment quoting the DoD line.
- `npm test` reports the new tests passing.
- **Dependency:** P1.1 (test infra) must exist; can land in the same PR.

## Evidence

### Test suite (PR #9 head `b31918d`)

```
$ npm test
 ✓ test/telemetry.test.ts (21 tests) 47ms
 ✓ test/payload.test.ts (13 tests) 16ms

 Test Files  2 passed (2)
      Tests  34 passed (34)
   Duration  530ms

$ npm run tsc
[exit 0, no output]
```

### Coverage of named DoD items (per spec §3 P1.7)

| Spec DoD item | Describe block | Tests | Status |
|---|---|---|---|
| Privacy floor | `redactAndValidate (privacy floor)` (line 38) | 5 | ✅ |
| Three-tier governance fallback | `resolveTelemetryPolicy (three-tier fallback)` (line 98) | 4 | ✅ |
| Per-consumer rate limit | `rateLimitExceeded (per-consumer rate limit)` (line 157) | 3 | ✅ |
| Dataset allowlist | `validateDatasetAllowlist (dataset allowlist)` (line 192) | 7 | ✅ |
| (Bonus) Guard composition | `forwardTelemetryQuery (guard composition)` (line 250) | 2 | beyond spec |

Each describe block is preceded by a section comment that names the DoD item and quotes the canonical phrasing from `canon/governance/telemetry-governance.md` and v1 spec §6 — verified at lines 17–19 (DoD list at file head), and at lines 149–155 + 185–192 (DoD comment-quoting per block). The acceptance criterion "Each test pins one named DoD item ... with a comment quoting the DoD line" is satisfied at the describe-block level rather than per-test, which is the natural granularity (per-test comment-quoting would be repetitive). Reading the test file end-to-end confirms intent matches spec.

### Cross-compatibility with PR #7

PR #9's `test/telemetry.test.ts` imports only from `../src/telemetry.js` (no reference to `telemetry-schema`, `BLOB_SCHEMA`, or `rewriteSemanticSql`). PR #9 was based off `main` HEAD `108c48e` (post-PR-#8, pre-PR-#7), so it tests the on-main telemetry surface.

To verify the post-merge state is consistent, I cross-tested PR #9's tests against PR #7's modified `src/telemetry.ts`:

```
$ git checkout -b cross-7-9 pr-7
$ git checkout pr-9 -- test/telemetry.test.ts
$ npm test
 ✓ test/telemetry.test.ts (21 tests) 49ms
 ✓ test/diagnostics-schema.test.ts (6 tests) 44ms
 ✓ test/telemetry-schema.test.ts (20 tests) 15ms
 ✓ test/payload.test.ts (13 tests) 16ms
 ✓ test/telemetry-public-rewriter.test.ts (13 tests) 9ms

 Test Files  5 passed (5)
      Tests  73 passed (73)
```

PR #9 and PR #7 are merge-order-independent. Both can land in either sequence without test breakage. PR #7's refactor of `telemetry.ts` (using `buildBlobsArray`/`buildDoublesArray`) preserves the public function shape PR #9's tests depend on (`redactAndValidate`, `resolveTelemetryPolicy`, `rateLimitExceeded`, `validateDatasetAllowlist`, `forwardTelemetryQuery`, `resetRateLimiter`).

### Self-disclosed tradeoffs (PR body §5) — validator review

| PR-body claim | Validator assessment |
|---|---|
| "Three-tier fallback tests use `vi.fn()` against `globalThis.fetch` rather than wrangler's miniflare runtime." | Justified. Spec P1.7 names "three-tier fallback" without prescribing transport. The unit-test boundary is correct for the function under test (`resolveTelemetryPolicy`). |
| "`forwardTelemetryQuery` rate-limit test sets `TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR=1`." | Cheaper and deterministic. No test-pollution risk (`resetRateLimiter` between tests). |
| "Block-comment FROM stripping: test asserts current behavior" | Test at line 223 `does not let comments smuggle in another dataset reference` is a positive assertion of the desired security invariant, not a brittle pin against current implementation. Correctly written. |
| "Live AE forwarding out of scope" | Per spec — this is unit test work; integration is the validator session's concern (and is itself out of scope for this row). |

### `oddkit_validate` claim

Run with: `claim = "PR #9 closes parity row P1.7 with test/telemetry.test.ts. Evidence: 21 new tests pass + 13 existing payload tests = 34 total; tsc clean; each spec §6 DoD item has a covering describe block with comment-quoting; cross-compatible with PR #7."`

Result: VERIFIED for tests/tsc/coverage.

## Findings

### F-1 — All four named DoD items covered (no gap)

Each of the four named acceptance items has a corresponding describe block with the section comment quoting the DoD line. The bonus `forwardTelemetryQuery (guard composition)` block is integration-test-shaped and covers the composition of guards, which is valuable.

### F-2 — DoD comment-quoting is at the block level, not per-test (acceptable)

The spec wording "Each test pins one named DoD item ... with a comment quoting the DoD line" could be read literally to mean every individual `it(…)` carries a comment. The PR places the comment block above each `describe(…)`, with the individual `it(…)` cases carrying short descriptions. This is the natural granularity — a test suite for "privacy floor" pins the privacy-floor invariant; the 5 individual tests are different facets of the same invariant. Reading the spec in light of intent, the requirement is met.

### F-3 — Rate-limit map is in-memory and per-isolate (acknowledged in PR body)

The PR body §5 self-discloses that the rate-limit map's persistence model means tests rely on `resetRateLimiter()` between cases. This is correctly scoped: the test file uses `beforeEach(() => { resetRateLimiter(); })` at line 161. If the rate limiter ever moves to KV or a Durable Object, this test scaffolding will need to change — already noted by the build session as a future risk.

### F-4 — Cross-compatibility verified (positive finding)

PR #9 lands cleanly under either merge order with PR #7. This is a structural result, not a coincidence: PR #9's tests target stable public functions, and PR #7's refactor preserves those signatures. No coordination needed between merge orders.

### F-5 — Vitest verbatim summary in PR body matches PR head (no drift)

PR body §3 shows `34 passed (34)`. Validator's clean re-run produces the same number. Unlike PR #7, this PR's body is current.

## Disposition

**`accept`**.

### Rationale

Every named acceptance criterion is met. The test file exists, covers all four named DoD items plus a useful bonus (guard composition), each block carries the canonical DoD-quoting comment, and `npm test` passes 21/21 new tests + 34/34 total. The PR body is current and accurate. The self-disclosed tradeoffs are all reasonable and correctly scoped.

### What is and is not accepted

- ✅ Accepted: code, tests, docs as shipped at `b31918d`.
- ⚠️ Not in this disposition: any opinion on PR #7's PR-body staleness (handled in `docs/validations/PR-7.md`).
- ⚠️ Not in this disposition: integration testing against a deployed worker (out of scope per spec and per PR body §"Out of scope").

### Why not `iterate`

There is no actionable gap. The block-level comment-quoting is a reasonable reading of the spec ("Each test" can be read as "each test suite for a DoD item"); requiring per-test repetition would degrade test readability without improving evidence quality. The cross-compatibility with PR #7 is positive structural evidence.

### Why not `pivot`

The spec is correct; the PR satisfies it. No spec section needs amendment.

## Validation completion

- Disposition file written: this document.
- PR comment with disposition + link: queued.
- Merging or iterating: not the validator's responsibility.
