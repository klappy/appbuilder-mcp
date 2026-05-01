---
title: "appbuilder-mcp Parity Spec — v1 (Frozen Contract)"
audience: project
exposure: working
voice: neutral
stability: locks_at_first_build_pr
tags: ["parity", "spec", "definition-of-done", "freeze", "build-session-contract", "ptxprint-mcp", "phase-a"]
date: 2026-05-01
version: v1
supersedes: ""
governs: "the contract that binds the build session closing rows in docs/parity-matrix.md; locks at the moment the first feat/* branch is opened against this spec"
derives_from: "docs/parity-matrix.md (companion artifact, same session), klappy://canon/principles/specs-lock-at-implementation, klappy://canon/definition-of-done, klappy://canon/principles/contract-governs-handoff-drift, klappy://canon/principles/verification-requires-fresh-context"
status: draft_for_lock
---

# appbuilder-mcp Parity Spec — v1

> Frozen contract for the build session that will close gaps from
> `docs/parity-matrix.md` against the reference `klappy/ptxprint-mcp`. The
> matrix lists *what* is open; this spec defines *what done means* for each
> priority tier, *how* the build session is bound (no silent amendments,
> SPEC-AMENDMENT blocker pattern), *when* the build session may stop, and
> *how* a fresh-context validator session reviews the result. Acceptance
> criteria are written as falsifiable conditions an external reviewer can
> check without re-deriving intent. The spec locks the moment the first
> `feat/*` branch is pushed against any row; thereafter changes ship as
> `parity-spec-v2.md`, never as edits here.

---

## Summary — What This Document Is and What It Is Not

`docs/parity-matrix.md` is the row-by-row inventory of every dimension on
which `appbuilder-mcp` differs from `ptxprint-mcp`. It is descriptive: it
makes gaps visible. It is not a contract.

This document is the contract. It declares:

1. **Definition of Done** — the five evidence requirements every closing PR
   must satisfy (mission-level and per-row), inherited from
   `klappy://canon/definition-of-done`.
2. **Acceptance criteria per priority tier** — falsifiable conditions for
   each P1 / P2 / P3 row from §11 of the matrix. A row is `closed` only when
   its acceptance conditions are met; the build session marks
   `status: in_review`, the validator session marks `status: closed`.
3. **Freeze rules** — the spec is locked at first-PR-push per
   `klappy://canon/principles/specs-lock-at-implementation`. Forward-looking
   changes ship as `parity-spec-v2.md` after a validator-led pivot, never as
   edits here.
4. **Stop conditions** — when the build session terminates: parity met,
   blocker count exceeds buildable rows, or a SPEC-AMENDMENT blocks remaining
   work.
5. **Validation hand-off** — the protocol for the fresh-context validator
   session reviewing each build PR.

The matrix is the *what*. The spec is the *contract*. Code is the *proof*.

---

## §1 — Scope

### 1.1 In scope

The build session closes rows from `docs/parity-matrix.md` §11 in priority
order. P1 (rows 1–7) is mandatory for parity. P2 (rows 8–16) is mandatory
for parity. P3 (rows 17–23) is deferrable per §6 below.

### 1.2 Out of scope

- Closing rows the matrix marks `n/a (inapplicable)`, `n/a (joint
  deficiency)`, or `n/a (appbuilder ahead)`. Reclassification is allowed
  only via SPEC-AMENDMENT.
- Adding GitHub Actions CI to `appbuilder-mcp` while `ptxprint-mcp` has none
  (matrix §4 — "joint deficiency"). Unilateral upgrade is not a parity
  action.
- Implementing the public homepage (matrix row 23, `src/homepage.ts`,
  ~1735 LOC). This row is explicitly deferred — see §4.3.
- Editing `docs/parity-matrix.md` to remove or rewrite an open row. The
  matrix is append-only for closed work; reclassification keeps the row and
  changes its `status` field with a one-sentence rationale (matrix §12).

### 1.3 Reference target

Reference repo:
`klappy/ptxprint-mcp` @ `4271d700ffd290034190cc0751726fdd29e5fe0c` per
`docs/parity-matrix.md` Provenance block. The build session does not chase a
moving target; the spec is bound to the matrix's pinned reference SHA. If
upstream `ptxprint-mcp` ships a feature post-snapshot, it is **not** in scope
unless the matrix is re-snapshotted in a separate session.

---

## §2 — Definition of Done

Inherited verbatim from `klappy://canon/definition-of-done`. Every row-closing
PR (the build session's primary unit of work) must satisfy all five evidence
requirements. None is optional.

| # | Requirement | Concrete form for a row-closing PR |
|---|---|---|
| 1 | **Change Description** | PR body names the matrix row(s) being closed by ID (e.g. "P1.2: Author `src/telemetry-schema.ts`") and lists the files added/modified. |
| 2 | **Verification Performed** | PR body lists the commands run: `npm test`, `tsc --noEmit`, `wrangler deploy --dry-run`, scripted MCP-client transcript, etc. Each command is reproducible from the repo state at the PR head. |
| 3 | **Observed Behavior** | PR body quotes the actual output: test pass count, tool-call response shape, error envelope contents. Not "it should pass" — the literal stdout/stderr or a path to a captured transcript. |
| 4 | **Evidence Produced** | At least one of: test output snippet inline in the PR body, a transcript file at `docs/transcripts/<branch>.md`, a captured request/response pair, a `wrangler deploy --dry-run` summary. Evidence post-dates the change and is specific to the row. |
| 5 | **Self-Audit Completed** | PR body's "Self-Audit" section names: intended outcome (which row), constraints applied (canon URIs consulted), tradeoffs (assumptions made without an operator), remaining risks (what the validator should look at hardest). |

A PR missing any of these is `partial completion` per the DoD canon. The
build session marks the matrix row `status: in_review` only after the PR
contains all five. The validator session refuses to mark `status: closed`
on any PR that fails this check.

### 2.1 Document deliverables — additional checklist

Rows that produce a Markdown document (P2 rows 12–16, P3 rows 17–18, etc.)
must additionally pass the Writing Canon checklist
(`klappy://canon/meta/writing-canon`):

1. Title names the concept and its stance.
2. Blockquote contains the complete compressed argument.
3. Frontmatter includes `epoch`, `derives_from`, `governs` with full file
   paths.
4. `## Summary — [subtitle]` is self-contained.
5. Headers pass the scan test.
6. No buried claims.

A document that exists but fails progressive disclosure is not done.

---

## §3 — Acceptance Criteria — P1 Rows (Foundational; Mandatory for Parity)

P1 rows from `docs/parity-matrix.md` §11. Each criterion is falsifiable: a
validator can check it without re-deriving intent.

### P1.1 — Add `test/` directory and the first test
- **Closes matrix rows:** §3 row "test/ directory" and the §3 "Practical impact" note.
- **Acceptance:**
  - `test/` directory exists at repo root.
  - At least one `*.test.ts` file under `test/` exercises real production code (not a tautological assertion).
  - `npm test` (alias `vitest run`) reports a non-zero pass count and zero failures from a clean checkout.
  - PR body includes the verbatim `vitest` summary line(s).
- **Out of scope for this row:** broad coverage. The minimum is one passing real test; subsequent P1 rows raise the bar.

### P1.2 — Author `src/telemetry-schema.ts`
- **Closes matrix rows:** §2 `telemetry-schema.ts` (absent), §2 `telemetry.ts` (coupled).
- **Acceptance:**
  - `src/telemetry-schema.ts` exists.
  - Module exports `BLOB_SCHEMA`, `DOUBLE_SCHEMA` as ordered, frozen lists.
  - Module exports helpers `b()`, `d()`, `buildBlobsArray()`, `buildDoublesArray()`, `rewriteSemanticSql()`, `exportSchema()` with shapes that match `ptxprint-mcp`'s module API at the pinned reference SHA.
  - `src/telemetry.ts` no longer holds scattered position assumptions for blob/double indices; all access goes through the new helpers.
  - `tsc --noEmit` passes.
- **Pinning test (delivered with this row or P1.7):** a `test/telemetry-schema.test.ts` asserting the position-to-name map is identical to a hand-pinned constant; the test breaks if any field is reordered.

### P1.3 — Add the `telemetry_schema` MCP tool
- **Closes matrix rows:** §1 `telemetry_schema` (absent).
- **Acceptance:**
  - `tools/list` over MCP returns 7 tools (was 6) including `telemetry_schema`.
  - Calling `telemetry_schema` returns the output of `exportSchema()` from P1.2 — `{ blobs: [{name, position, desc}, …], doubles: [{name, position, desc}, …] }`.
  - PR body includes a captured MCP transcript: `tools/list` request → response with the new tool name visible.
- **Dependency:** P1.2 must merge first or in the same PR.

### P1.4 — Wire the semantic-name SQL rewriter into `telemetry_public`
- **Closes matrix rows:** §1 `telemetry_public` (semantic-name SQL rewriting absent).
- **Acceptance:**
  - `telemetry_public` accepts SQL containing bare schema names (e.g. `WHERE event_type = 'tool_call'`) and rewrites to positional refs (`WHERE blob1 = 'tool_call'`) before forwarding to Analytics Engine.
  - Test `test/telemetry-public-rewriter.test.ts` covers: bare-name SELECT → `colN AS name`; bare-name WHERE → `colN`; string literals untouched; positional refs idempotent (a query using `blob1` directly still works); user `AS` aliases preserved.
  - Tool description in `src/index.ts` advertises the rewriter and links to `telemetry_schema` for field discovery.
- **Dependency:** P1.2 must merge first.

### P1.5 — Add `GET /diagnostics/schema` HTTP endpoint
- **Closes matrix rows:** §6 `/diagnostics/schema` (absent).
- **Acceptance:**
  - `GET /diagnostics/schema` returns HTTP 200 with `Content-Type: application/json` and a body equal to `exportSchema()`.
  - PR body includes a `curl` transcript against a running instance (`wrangler dev` is acceptable) or against a deployed worker.
- **Dependency:** P1.2 must merge first.

### P1.6 — Author `DEPLOY.md`
- **Closes matrix rows:** §7 `DEPLOY.md` (absent).
- **Acceptance:**
  - `DEPLOY.md` exists at repo root.
  - Document includes, at minimum: secret-set walkthrough for `CF_API_TOKEN`, `CF_ACCOUNT_ID` (or its public-var alternative — see P3.21), and optional `TELEMETRY_VERIFIED_CLIENTS` and `SNAPSHOT_BOOTSTRAP_TOKEN`; R2 lifecycle policy (`wrangler r2 bucket lifecycle set` invocation or equivalent); post-deploy verification (`curl /health`); production-keystore secret pattern with a worked example.
  - Passes Writing Canon checklist (§2.1).
- **Out of scope:** automating the deploy. The doc is the recipe; CI work is a joint deficiency (§1.2).

### P1.7 — Author `test/telemetry.test.ts`
- **Closes matrix rows:** §3 "Telemetry unit tests" (absent).
- **Acceptance:**
  - `test/telemetry.test.ts` exists with at least one test per spec §6 DoD item (privacy floor, three-tier fallback, rate-limit, dataset-allowlist).
  - Each test pins one named DoD item from `canon/specs/appbuilder-mcp-v1-spec.md` §6 with a comment quoting the DoD line.
  - `npm test` reports the new tests passing.
- **Dependency:** P1.1 (test infra) must exist; can land in the same PR.

### P1 — Tier-level closure condition

P1 is closed when **all** of P1.1–P1.7 are `status: in_review` or `closed`,
**and** the validator session has accepted at least P1.2, P1.3, P1.4 (the
schema-as-source-of-truth chain) — these three are coupled and must be
validated as a unit.

---

## §4 — Acceptance Criteria — P2 Rows (Substantial Functionality; Mandatory for Parity)

### P2.8 — Author `src/snapshot.ts`
- **Closes matrix rows:** §2 `snapshot.ts` (absent).
- **Acceptance:**
  - `src/snapshot.ts` exists.
  - Module exports `runSnapshot()`, `runSnapshotForWeeks()`, `mergeSnapshots()`, JSONL parse/serialize helpers, `getLifetimeHeroStat()`, `METRICS` declaration — shapes match `ptxprint-mcp`'s module API.
  - `METRICS` table contains at least four SAB-equivalent metric definitions (build count, success rate, failure-mode distribution, lifetime cumulative). The four metrics are named in the PR body with a one-line justification each.
  - `tsc --noEmit` passes.

### P2.9 — Add `TELEMETRY_SNAPSHOTS` R2 bucket and weekly cron
- **Closes matrix rows:** §5 `TELEMETRY_SNAPSHOTS` (absent), §5 `triggers.crons` (absent).
- **Acceptance:**
  - `wrangler.jsonc` declares an R2 binding `TELEMETRY_SNAPSHOTS` with bucket name `appbuilder-telemetry-snapshots` (or the operator-configured equivalent — document in `DEPLOY.md`).
  - `wrangler.jsonc` declares `triggers.crons: ["0 0 * * 1"]`.
  - `wrangler deploy --dry-run` succeeds and the dry-run output includes the new binding and trigger.
- **Dependency:** P2.8.

### P2.10 — Add `POST /internal/snapshot/run` route
- **Closes matrix rows:** §6 `/internal/snapshot/run` (absent).
- **Acceptance:**
  - `POST /internal/snapshot/run` exists in `src/index.ts`, gated by `SNAPSHOT_BOOTSTRAP_TOKEN` secret (rejects with HTTP 401/403 when absent or mismatched).
  - PR body includes a curl transcript: one rejected request without the token, one accepted request that triggers `runSnapshotForWeeks()`.
- **Dependency:** P2.8.

### P2.11 — Author `test/snapshot.test.ts`
- **Closes matrix rows:** §3 "Snapshot tests" (absent).
- **Acceptance:**
  - `test/snapshot.test.ts` covers: date helpers, JSONL round-trip, merge-by-key idempotency, week-boundary correctness.
  - Each subtest names which `snapshot.ts` export it exercises.
  - `npm test` reports the new tests passing.
- **Dependency:** P2.8.

### P2.12 — Author `canon/governance/headless-operations.md`
- **Closes matrix rows:** §9.3 `headless-operations.md` (absent).
- **Acceptance:**
  - File exists at the named path.
  - Adapts `ptxprint-mcp`'s structure (Parts 0–12 + Provenance) to driving SAB headlessly: APK building, keystore handling, build artifact retrieval, gradle cache implications, ABI selection, signing.
  - No verbatim-copy from PTXprint domain (matrix anti-pattern: do not infer SAB behavior from PTXprint behavior).
  - Passes Writing Canon checklist (§2.1).

### P2.13 — Author `canon/articles/diagnostic-patterns.md`
- **Closes matrix rows:** §9.2 `diagnostic-patterns.md`.
- **Acceptance:**
  - At least 6 SAB-specific diagnostic patterns documented (suggestions: gradle errors, signing failures, missing keystore, manifest merge issues, ABI mismatches, malformed USFM).
  - Each pattern names: trigger, observable signature, root cause, remediation.
  - Passes Writing Canon checklist (§2.1).
  - Where possible, cross-references existing fixtures under `fixtures/`.

### P2.14 — Author `canon/articles/workflow-recipes.md`
- **Closes matrix rows:** §9.2 `workflow-recipes.md`.
- **Acceptance:**
  - At least three end-to-end recipes: minimum-viable APK, debug-install-and-launch on a connected device, smoke-test cycle (build → adb install → adb logcat capture).
  - Each recipe is reproducible from a clean repo by an agent following only the doc.
  - Passes Writing Canon checklist (§2.1).

### P2.15 — Author `canon/articles/snapshot-operations.md`
- **Closes matrix rows:** §9.2 `snapshot-operations.md`.
- **Acceptance:**
  - Operator companion to P2.8–P2.11. Covers: kicking off backfills, reading lifetime hero stats, week-boundary semantics, restoring snapshots after R2 lifecycle action.
  - Passes Writing Canon checklist (§2.1).
- **Dependency:** P2.8–P2.11.

### P2.16 — Author `canon/articles/hero-metrics-and-storytelling.md`
- **Closes matrix rows:** §9.2 `hero-metrics-and-storytelling.md`.
- **Acceptance:**
  - Rationale layer for P2.8's `METRICS` table — why those four metrics, what story they tell, how they age.
  - Passes Writing Canon checklist (§2.1).
- **Dependency:** P2.8.

### P2 — Tier-level closure condition

P2 is closed when **all** of P2.8–P2.16 are `status: in_review` or `closed`,
**and** the validator session has accepted P2.8–P2.11 as a unit (the
snapshot-mechanism chain). P2.12–P2.16 may close independently.

---

## §5 — Acceptance Criteria — P3 Rows (Depth / Polish; Deferrable)

P3 rows are **not** mandatory for the build session's stop condition. They
are tracked for completeness and may be closed in the same session if time
allows, or deferred to a follow-up parity sweep. A row may be deferred
(without a SPEC-AMENDMENT) by the build session marking
`status: deferred-to-followup` with a one-sentence reason.

| Row | Concept | Closure form | Deferral allowed |
|---|---|---|---|
| P3.17 | Remaining applicable canon articles (8 articles enumerated in matrix §9.2) | One PR per article OR one batch PR; each article passes Writing Canon checklist | yes |
| P3.18 | `canon/templates/minimal-english-bible-apk.md` | Template doc; passes Writing Canon checklist; produces a working APK when followed | yes |
| P3.19 | `canon/surfaces/scripture-app-builder-source.surface.{md,json}` | ESE of `sillsdev/scripture-app-builder`; the JSON is machine-readable | yes |
| P3.20 | `scripts/e2e-walkthrough.sh` | Shell script: clean install → connect → exercise every tool → teardown; runs to completion in a clean shell | yes |
| P3.21 | Resolve `vars.CF_ACCOUNT_ID` public-vs-secret decision | One-line ADR in `canon/encodings/`; `wrangler.jsonc` updated to match | yes |
| P3.22 | README phase-status refresh | README "Status" section updated post-P1 + post-P2 close; reflects shipped state | yes (but trigger after P1+P2 close) |
| P3.23 | `src/homepage.ts` | **Explicitly deferred unless an external requirement surfaces.** Largest item by LOC, lowest priority. | yes (default) |

### 5.1 P3.23 deferral

`src/homepage.ts` is deferred by spec. The build session does **not** close
this row. If an external requirement surfaces, it warrants a SPEC-AMENDMENT
(§6.2) reclassifying it. Treating P3.23 as required without an amendment is
a violation of this spec.

---

## §6 — Freeze Rules (Spec-Lock Discipline)

Per `klappy://canon/principles/specs-lock-at-implementation`, this spec
locks the moment the build session pushes the first `feat/*` branch against
any row. Thereafter:

### 6.1 What the build session may NOT do

- Edit this file (`docs/parity-spec.md`) to clarify acceptance criteria.
- Edit `docs/parity-matrix.md` to remove or rewrite an open row.
- Reclassify a row from `open` to `n/a` or to a different priority tier.
- "Quietly clarify" by interpreting a criterion liberally without filing the
  interpretation as a SPEC-AMENDMENT.
- Combine multiple rows into a single PR without naming each row in the PR
  body (rows may share a PR if they have a hard dependency, e.g. P1.2 +
  P1.3 + P1.4; otherwise one PR per row).

### 6.2 SPEC-AMENDMENT protocol

If the build session discovers, during execution, that an acceptance
criterion is wrong, ambiguous, impossible, or in tension with canon, it
**stops on that row** and writes:

```
BLOCKERS/SPEC-AMENDMENT-<short-slug>.md
```

Containing:

- Spec section and row ID being amended.
- The current criterion (verbatim).
- The proposed criterion (verbatim).
- Evidence: what the session attempted, what canon was consulted (URIs),
  what was observed.
- Impact: which other rows are affected; whether the build session can
  continue with non-affected rows.

The amendment is **not** applied. The build session continues with the next
non-affected row. The validator session reviews the amendment as part of
its disposition; if the validator agrees, the disposition is `pivot` and a
follow-up `parity-spec-v2.md` is authored in a new spec session.

### 6.3 What survives unchanged

The frontmatter `version`, `date`, `status`, and `derives_from` survive the
lock. The body of this document does not change. If forward-looking changes
are accepted, they ship as `docs/parity-spec-v2.md` with `supersedes:
docs/parity-spec.md` in its frontmatter, per the canon principle's pattern.

---

## §7 — Stop Conditions (Build Session)

The build session terminates when **any one** of these is true:

1. **Parity met (success):** every row in P1 (§3) and P2 (§4) is
   `status: in_review` or `status: closed`. P3 rows are deferred-allowed
   (§5).
2. **Blocker overflow (gridlock):** the count of open `BLOCKERS/BLOCKER-*`
   files exceeds the count of remaining open buildable rows. The session
   writes a final `BLOCKERS/SESSION-EXIT-<UTC-ts>.md` summarizing each
   blocker and stops.
3. **Spec-blocking amendment (pivot required):** an open
   `BLOCKERS/SPEC-AMENDMENT-*` proposal blocks the rest of the work
   (every remaining row depends transitively on the amended criterion). The
   session stops with `SESSION-EXIT-<UTC-ts>.md` naming the blocking
   amendment and recommending a fresh spec session.

In **no** case does the build session terminate by editing this spec to
match what was actually built. That is the failure mode the principle
exists to prevent.

---

## §8 — Validation Hand-Off

Each row-closing PR is reviewed by a fresh-context validator session per
`docs/agent-prompts/03-validator-session.md` and
`klappy://canon/principles/verification-requires-fresh-context`. The build
session does **not** validate its own PRs — running smoke checks for one's
own confidence is allowed and encouraged, but it is not validation.

### 8.1 Validator's bound scope

The validator reviews the PR against this spec's acceptance criteria for
the named row(s). It does **not** introduce new requirements the row was
never asked to satisfy. If the validator believes the spec itself is wrong,
the disposition is `pivot` (§6.2), not `iterate`.

### 8.2 Disposition vocabulary

- `accept` — all five DoD requirements present, all row acceptance criteria
  met, validator marks matrix row `status: closed` and merges (or signals
  ready-to-merge).
- `iterate` — DoD or acceptance gaps exist. Validator names the gap, the
  build session opens an iteration PR, validator re-reviews. The matrix row
  stays `status: in_review`.
- `pivot` — the spec criterion was wrong. Validator files a
  `BLOCKERS/SPEC-AMENDMENT-*`-style finding in
  `docs/validations/PR-<N>.md` and recommends a v2 spec session.

### 8.3 Mission-wide validation

When all P1 and P2 rows are `status: closed`, a final mission-level
validation session runs `oddkit(action="validate", input="appbuilder-mcp at
parity with ptxprint-mcp per docs/parity-matrix.md and
docs/parity-spec.md")`. A `VERIFIED` result, with all artifact references
resolvable, is the spec's terminal success condition. The session writes
`docs/parity-achieved-<YYYY-MM-DD>.md` with the matrix snapshot, the
validate output, and the encoded canon entries from the run.

---

## §9 — Operating Constraints (Inheritance)

This spec inherits and does not duplicate:

- `AGENTS.md` — creed, axioms, time rule.
- `klappy://canon/bootstrap/model-operating-contract` — tool rhythm, mode
  discipline, bottleneck respect, OLDC+H, failure signals.
- `klappy://canon/definition-of-done` — five evidence requirements.
- `klappy://canon/principles/specs-lock-at-implementation` — freeze
  discipline.
- `klappy://canon/principles/verification-requires-fresh-context` —
  validator separation.
- `klappy://canon/principles/contract-governs-handoff-drift` — when a
  session ledger conflicts with this spec, this spec wins.

If any of the above evolves between the spec-author session and the
build-session execution, the build session reads the canon at session
start; the spec body does not need to be updated to reflect the canon
update (canon is the source of truth, this spec points to it).

---

## §10 — Change Log

| Version | Date | Author session | Changes |
|---|---|---|---|
| v1 | 2026-05-01 | `claude/build-spec-handoff-XHV5M` | Initial spec. Derived from `docs/parity-matrix.md` (same session). Locks at first build-session `feat/*` push. |
