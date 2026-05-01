---
title: "appbuilder-mcp ⇄ ptxprint-mcp Parity Matrix"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["parity", "matrix", "ptxprint-mcp", "discovery", "phase-a"]
date: 2026-05-01
status: working
governs: "the gap inventory between appbuilder-mcp and its reference implementation klappy/ptxprint-mcp; load-bearing input to prioritization, NOT a runtime contract"
derives_from: "klappy://canon/README (ptxprint-mcp canon README — same structural overlay pattern)"
---

# Parity Matrix — appbuilder-mcp ⇄ ptxprint-mcp

> Inventory of every dimension on which `klappy/appbuilder-mcp` differs from
> its reference implementation `klappy/ptxprint-mcp`, with a priority tier
> per row. This document is the Phase-A discovery artifact — it does not
> close gaps; it makes them visible so subsequent branches can each close
> exactly one.

## Provenance

- **Reference repo:** `klappy/ptxprint-mcp` @ `4271d700ffd290034190cc0751726fdd29e5fe0c` (HEAD as of compare).
- **Target repo:** `klappy/appbuilder-mcp` @ `ae8e784e9597e5dce03361a40cc0c749bebce4f7` (branch `claude/appbuilder-parity-IhUAz`).
- **Compare timestamp (UTC):** 2026-05-01.
- **Methodology:** read both repos end-to-end (file listings, src LOC, tool registrations, route handlers, package + wrangler manifests, READMEs, canon directories, test layouts, Dockerfile heads). Where conceptual applicability is in question (SAB does not have all of PTXprint's domain surface), the row is marked `n/a — domain-inapplicable` rather than a gap.

## How to read this document

Each section is a parity dimension. Each row carries:

| ptxprint-mcp state | appbuilder-mcp state | gap | priority | status |
|---|---|---|---|---|

- **Priority tiers** (per the autonomous-loop prompt's "foundational > additive > polish" heuristic):
  - **P1** — foundational/blocking. Either present in ptxprint-mcp as load-bearing infrastructure (tests, telemetry-schema source-of-truth, deploy docs) or required for honest parity claims.
  - **P2** — substantial functionality present in ptxprint-mcp that has a SAB analogue. Closing these moves appbuilder from "structural twin" to "feature parity."
  - **P3** — depth/polish: extra canon articles, additional spec versions, derivative docs. Quality multipliers, not blockers.
  - **n/a** — domain-inapplicable (PTXprint has TeX-specific surface that SAB does not), or appbuilder is already ahead.

- **Status** is one of `open` | `in-flight` | `closed` | `n/a (inapplicable)` | `n/a (joint deficiency)` | `n/a (appbuilder ahead)`. The matrix is append-only for closed work — never delete an open row to make the matrix look better. When a row is closed, change `open` → `closed` and add the closing PR / commit reference.

---

## 1. MCP tool surface

This is the most visible parity dimension — what an MCP client sees on `tools/list`.

| ptxprint-mcp tool | appbuilder-mcp tool | gap | priority | status |
|---|---|---|---|---|
| `submit_typeset` | `submit_build` | renamed to domain; structurally equivalent (returns `job_id` + predicted output URL) | n/a | closed (already at parity) |
| `get_job_status` | `get_job_status` | none | n/a | closed |
| `cancel_job` | `cancel_job` | none | n/a | closed |
| `docs` | `docs` | none (both backed by oddkit, both reference their own canon) | n/a | closed |
| `telemetry_policy` | `telemetry_policy` | none (both use three-tier fallback to `telemetry-governance.md`) | n/a | closed |
| `telemetry_public` (with semantic-name SQL rewriter — `WHERE event_type='tool_call'` auto-rewritten to `WHERE blob1='tool_call'`) | `telemetry_public` (positional refs only — caller must use `blob1`/`double2`) | semantic-name SQL rewriting absent; ergonomic regression | P1 | in_review (P1.4; `feat/telemetry-schema-source-of-truth`) |
| `telemetry_schema` (returns the `{name, position, desc}` mapping for every blob/double) | **absent** | tool missing entirely; without it agents have no runtime way to discover the field names the rewriter accepts | P1 | in_review (P1.3; `feat/telemetry-schema-source-of-truth`) |

**Tool count:** ptxprint-mcp = 7, appbuilder-mcp = 6. The single missing tool is `telemetry_schema`. Closing this is coupled to closing the `telemetry-schema.ts` module gap in §2.

---

## 2. Source modules (`src/*.ts`)

| Module | ptxprint-mcp LOC | appbuilder-mcp LOC | gap | priority | status |
|---|---|---|---|---|---|
| `index.ts` (Worker entry, MCP agent, route handlers) | 1177 | 797 | appbuilder is ~380 LOC lighter, mostly because it lacks the snapshot route + `/diagnostics/schema` + `telemetry_schema` tool | P1 (coupled rows) | open |
| `payload.ts` | 117 | 147 | shape parity; appbuilder has +30 LOC for SAB-specific source kinds (USFM/USX/burrito) | n/a | closed (appbuilder ahead on domain coverage) |
| `job-state-do.ts` | 153 | 150 | structural parity | n/a | closed |
| `bundled-policy.ts` | 7 | 7 | identical pattern | n/a | closed |
| `container.ts` | 32 | 37 | structural parity (5-LOC delta likely the SAB-specific job route name) | n/a | closed |
| `output-naming.ts` | 39 | 37 | structural parity | n/a | closed |
| `telemetry.ts` | 546 | 519 | comparable; ptxprint-mcp's is slimmer because schema declaration moved to `telemetry-schema.ts`. appbuilder's still has scattered position assumptions | coupled to `telemetry-schema.ts` gap below | P1 | in_review (P1.2 coupled; `feat/telemetry-schema-source-of-truth`) |
| `docs.ts` | 326 | 326 | identical structure (oddkit proxy) | n/a | closed |
| `stubs/ai-empty.ts` | (present) | (present) | identical | n/a | closed |
| **`telemetry-schema.ts`** (BLOB_SCHEMA, DOUBLE_SCHEMA, `b()` / `d()` helpers, `rewriteSemanticSql()`, `buildBlobsArray()` / `buildDoublesArray()`, `exportSchema()` for the MCP tool) | 296 | **absent** | the entire schema-as-source-of-truth module is missing — without it column-position drift is silent; with it, drift becomes a compile/test error | P1 | in_review (P1.2; `feat/telemetry-schema-source-of-truth`) |
| **`snapshot.ts`** (Track A weekly snapshot mechanism — `runSnapshot()`, `runSnapshotForWeeks()`, `mergeSnapshots()`, JSONL parse/serialize, `getLifetimeHeroStat()`, `METRICS` table) | 586 | **absent** | weekly aggregate archive past the 90-day Analytics Engine retention; coupled to cron + R2 bucket + bootstrap route | P2 | open |
| **`homepage.ts`** (public landing page — book × font picker, audit panel, schema diagnostics, demo deploy) | 1735 | **absent** | public-facing demo / "vodka architecture" surface; appbuilder has no homepage at all | P3 | open |
| `telemetry-schema.ts` companion: `scripts/bundle-telemetry-policy.ts` | (present) | (present) | both ship the bundled-policy build script | n/a | closed |

**Total LOC delta:** ptxprint-mcp = 5014, appbuilder-mcp = 2020. ~2994 LOC of functionality absent, of which ~2617 LOC sit in three named modules above (homepage + snapshot + telemetry-schema).

---

## 3. Test suite

| Aspect | ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|---|
| `vitest.config.ts` present | ✓ (include: `test/**/*.test.ts`) | ✓ (identical) | none | n/a | closed |
| `npm test` script | `vitest run` | `vitest run` | none (script wired) | n/a | closed |
| `test/` directory | 3 files: `telemetry-schema.test.ts`, `snapshot.test.ts`, `telemetry.test.ts` | **absent (zero tests)** | `npm test` is currently a no-op against zero specs; coverage = 0 | P1 | in_review (P1.1; `feat/test-infra-payload`) |
| Schema-pinning tests (positions are forever) | covered in `telemetry-schema.test.ts` | absent | coupled to telemetry-schema.ts module gap | P1 | in_review (P1.2 coupled; `feat/telemetry-schema-source-of-truth`) |
| Telemetry unit tests (privacy-floor, three-tier fallback, rate-limit, dataset-allowlist) | covered in `telemetry.test.ts` | absent | the v1 spec §6 DoD items have no test pinning | P1 | in_review (P1.7; `feat/telemetry-tests`) |
| Snapshot tests (idempotency, week boundaries, JSONL round-trip, merge) | covered in `snapshot.test.ts` | absent | coupled to snapshot.ts module gap | P2 | open |

**Practical impact:** zero test coverage means no signal that telemetry, payload validation, or any future feature regresses. Smallest meaningful first commit on this dimension is one test that exercises payload validation against a fixture — anything is better than zero.

---

## 4. Continuous integration

| Aspect | ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|---|
| `.github/workflows/` | absent | absent | both lack CI; tests + tsc not run automatically on push/PR | P3 | n/a (joint deficiency) |
| Branch protection / required checks | unknown (out of repo scope) | unknown | not visible from clone | n/a | n/a |

This is a joint deficiency, not an appbuilder-specific gap. Adding CI to appbuilder while ptxprint-mcp also has none is *not* a parity action — it would be a unilateral upgrade. Flag for separate discussion; do not close as part of "reach parity."

---

## 5. Cloudflare infrastructure (`wrangler.jsonc`)

| Binding / setting | ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|---|
| Worker name | `ptxprint-mcp` | `appbuilder-mcp` | n/a (domain-correct) | n/a | closed |
| `compatibility_date` | 2026-04-01 | 2026-04-01 | identical | n/a | closed |
| `compatibility_flags` | `nodejs_compat` | `nodejs_compat` | identical | n/a | closed |
| `observability` | enabled, head_sampling=1 | enabled, head_sampling=1 | identical | n/a | closed |
| `alias.ai` (esbuild stub) | `./src/stubs/ai-empty.ts` | `./src/stubs/ai-empty.ts` | identical | n/a | closed |
| Durable Objects | 3 (McpAgent, JobStateDO, Container) | 3 (McpAgent, JobStateDO, Container) | naming differs (Ptxprint* vs Appbuilder*); structural parity | n/a | closed |
| SQLite DO migrations | v1 declares all 3 | v1 declares all 3 | identical pattern | n/a | closed |
| R2 bucket: `OUTPUTS` | `ptxprint-outputs` | `appbuilder-outputs` | n/a (domain-correct) | n/a | closed |
| R2 bucket: `TELEMETRY_SNAPSHOTS` | `ptxprint-telemetry-snapshots` | **absent** | needed to store weekly Track A snapshots; coupled to snapshot.ts module gap | P2 | open |
| Container instance type | `standard-2` (1 vCPU, 6 GiB) | `standard-3` (½ vCPU, 12 GiB) | appbuilder-justified — Android SDK + Gradle cache footprint | n/a (appbuilder-justified delta) | closed |
| Container `max_instances` | 5 | 10 | appbuilder bumped after Open-010; CF Containers bills running-instance-seconds, not provisioned ceiling | n/a (appbuilder-justified delta) | closed |
| `triggers.crons` | `["0 0 * * 1"]` (weekly Monday 00:00 UTC) | absent | needed to drive snapshot mechanism | P2 (coupled) | open |
| Analytics Engine dataset | `ptxprint_telemetry` | `appbuilder_telemetry` | n/a (domain-correct) | n/a | closed |
| `vars.WORKER_URL` | `https://ptxprint.klappy.dev` | `https://appbuilder-mcp.klappy.workers.dev` | n/a (domain-correct, both annotated with the "silent no-op" gotcha) | n/a | closed |
| `vars.*_TIMEOUT_DEFAULT` | 300 (PDF builds are short) | 1800 (APK builds are longer) | n/a (domain-correct) | n/a | closed |
| `vars.RESULT_PRESIGNED_TTL` | 604800 (7 days) | 604800 (7 days) | identical | n/a | closed |
| `vars.TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR` | 60 | 60 | identical | n/a | closed |
| `vars.CF_ACCOUNT_ID` | hardcoded as public var | annotated as secret in comment | minor: ptxprint argues it's public, appbuilder treats it as secret. Worth a one-line decision capture | P3 | open |
| Secret: `CF_API_TOKEN` | required for telemetry_public | required for telemetry_public | identical | n/a | closed |
| Secret: `TELEMETRY_VERIFIED_CLIENTS` | optional allowlist | optional allowlist | identical | n/a | closed |
| Secret: `SNAPSHOT_BOOTSTRAP_TOKEN` | required for `POST /internal/snapshot/run` | absent | needed for snapshot bootstrap route | P2 (coupled) | open |

---

## 6. HTTP routes (`src/index.ts` `fetch` handler)

| Route | ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|---|
| `POST /internal/job-update` | ✓ | ✓ | identical | n/a | closed |
| `POST /internal/telemetry` | ✓ | ✓ | identical | n/a | closed |
| `GET /internal/job-cancel-flag` | ✓ | ✓ | identical | n/a | closed |
| `PUT /internal/upload` | ✓ | ✓ | identical | n/a | closed |
| `POST /internal/snapshot/run` | ✓ (gated by `SNAPSHOT_BOOTSTRAP_TOKEN`) | absent | coupled to snapshot.ts | P2 | open |
| `GET /diagnostics/schema` | ✓ (returns the BLOB/DOUBLE schema as JSON for external query authors) | absent | coupled to telemetry-schema.ts; agent-friendly discovery surface | P1 | in_review (P1.5; `feat/telemetry-schema-source-of-truth`) |
| `GET /health` | ✓ (returns `{ ok, service, version, spec, tools }`) | unknown — needs verification | likely present (referenced in README) but not confirmed in this scan; check before claiming parity | P3 | open |
| `/mcp` (streamable HTTP), `/sse` (legacy) | both supported via `agents/mcp` | both supported via `agents/mcp` | identical (both use same SDK version) | n/a | closed |

---

## 7. Top-level documentation

| Doc | ptxprint-mcp LOC | appbuilder-mcp LOC | gap | priority | status |
|---|---|---|---|---|---|
| `README.md` | 158 | 121 | both have intro + architecture + status; appbuilder shorter due to fewer features to describe. Quality is comparable; phase-status section needs a refresh once snapshot/schema gaps close | P3 (refresh trigger) | open |
| `ARCHITECTURE.md` | 93 | 110 | parity (appbuilder slightly longer) | n/a | closed |
| `BUILD.md` | 166 | 282 | appbuilder substantially longer (Android-toolchain build is more complex than TeX install) | n/a (appbuilder ahead) | closed |
| `CONTRIBUTING.md` | 47 | 47 | identical | n/a | closed |
| `DEPLOY.md` | 172 | **absent** | secret-set walkthrough, R2 lifecycle, post-deploy verification — appbuilder operators have no equivalent recipe | P1 | in_review (P1.6; `feat/deploy-md`) |
| `LICENSE` | MIT | MIT | identical | n/a | closed |

---

## 8. Reproducible-smoke / fixture pattern

| Aspect | ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|---|
| Top-level `smoke/` directory | ✓ — 5 empirical payload pairs (`*.json` + `*.README.md`): bsb-jhn, bsb-psa, bsb-jas, bsb-jud, bsb-rev; plus `minimal-payload.json`, `fonts-payload.json` | absent | none — appbuilder uses `fixtures/` instead (h009, h010a, h010b, h010-full) | n/a (different idiom, not a gap) | closed |
| `fixtures/` directory (hypothesis-test fixtures) | absent | ✓ (h009 BookNames.xml, h010a DBL bundle mirror, h010b shape-aware, h010-full closure smoke) | n/a — appbuilder ahead on this dimension | n/a (appbuilder ahead) | closed |
| Scripted MCP-call walkthrough | partial — pseudocode in README; `smoke/docs-smoke.py` for `docs` tool | absent | a `scripts/e2e-walkthrough.sh` would close this for both repos; doing it appbuilder-first is acceptable | P3 | open |

---

## 9. Canon directory coverage

The two `canon/` directories share the same overlay convention (frontmatter, `klappy://` URIs, oddkit retrievability). The canon delta is large but most of it is ptxprint-domain-specific (TeX, USFM markers, picture lists).

### 9.1 Specs

| ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|
| `specs/ptxprint-mcp-v1.0-spec.md`, `…v1.1…`, `…v1.2…`, `…v1.3-spec.md` (current) + `archive/` | `specs/appbuilder-mcp-v1-spec.md` (single) | appbuilder is on its own v1 timeline; not a gap — different project, different version line. Will diverge naturally | n/a | closed |

### 9.2 Articles (the sized delta — 24 vs 7)

Of the 17 articles in ptxprint-mcp not present in appbuilder-mcp, **classification by domain applicability**:

| ptxprint article | SAB applicability | gap | priority | status |
|---|---|---|---|---|
| `adjlist-format.md` | ptxprint-only (paragraph adjustment list) | n/a (inapplicable) | n/a | closed |
| `agent-faq-customization.md` | applicable — every MCP needs this | author SAB version | P3 | open |
| `bundled-default-cfg.md` | partial — appbuilder has `bundled-debug-keystore.md` for the analogous concept | n/a (already covered) | n/a | closed |
| `changes-txt-format.md` | ptxprint-only (paratext changes.txt) | n/a (inapplicable) | n/a | closed |
| `composition-and-templates.md` | applicable — SAB has a comparable templating story | P3 | open |
| `config-construction.md` | ptxprint-only (XeTeX cfg files) | n/a (inapplicable) | n/a | closed |
| `config-inheritance-and-overrides.md` | ptxprint-only | n/a (inapplicable) | n/a | closed |
| `diagnostic-patterns.md` | applicable — SAB has its own patterns (gradle errors, signing failures, etc.) | P2 | open |
| `file-system-map.md` | applicable — SAB scratch layout, gradle cache, output dir | P3 | open |
| `font-resolution.md` | mostly inapplicable — SAB's font story is different | n/a (inapplicable) | n/a | closed |
| `frt-local-and-cover-periphs.md` | ptxprint-only | n/a (inapplicable) | n/a | closed |
| `hero-metrics-and-storytelling.md` | applicable — Track A snapshot rationale | P2 (coupled to snapshot module) | open |
| `output-naming.md` | applicable, partially covered by `src/output-naming.ts` comments | P3 | open |
| `phase-1-poc-scope.md` | covered by appbuilder spec | n/a (already covered) | n/a | closed |
| `piclist-format.md` | ptxprint-only | n/a (inapplicable) | n/a | closed |
| `progressive-customization.md` | applicable — SAB debug→release, default→branded progression | P3 | open |
| `settings-cookbook.md` | applicable — SAB settings cookbook | P3 | open |
| `snapshot-operations.md` | applicable — couples to snapshot module | P2 (coupled) | open |
| `stylesheet-format.md` | ptxprint-only | n/a (inapplicable) | n/a | closed |
| `usfm-markers-headless.md` | partial — SAB also consumes USFM, but markers behave differently in app context | P3 | open |
| `using-custom-fonts.md` | partial — SAB has its own font-bundling story | P3 | open |
| `workflow-recipes.md` | applicable — SAB build → install → test cycle recipes | P2 | open |

**Articles unique to appbuilder-mcp (correctly SAB-specific, not gaps in either direction):** `apk-installation.md`, `book-collections.md`, `bundled-debug-keystore.md`, `keystore-reuse.md`. These are appbuilder's domain-specific canon and should not be backported.

### 9.3 Governance

| ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|
| `governance/headless-operations.md` (Parts 0–12 + Provenance) | absent | applicable — every MCP-driven product benefits from a headless-operations manual | P2 | open |
| `governance/telemetry-governance.md` | `governance/telemetry-governance.md` | parity | n/a | closed |

### 9.4 Surfaces

| ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|
| `surfaces/ptx2pdf-surface.{md,json}` (upstream-source ESE) | absent | appbuilder has no equivalent ESE of `sillsdev/scripture-app-builder`; the `Scripture-App-Builder-02-Building-Apps.surface.md` covers operator docs but not the source repo | P3 | open |
| `surfaces/ptxprint-master-slides.surface.{md,json}` | absent | no SAB master-slides equivalent; might not exist upstream | n/a (likely inapplicable) | closed |
| `surfaces/Scripture-App-Builder-02-Building-Apps.surface.{md,json}` | ✓ | n/a — appbuilder-specific | n/a | closed |

### 9.5 Templates

| ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|
| `templates/english-single-book.md` | absent | applicable — a `templates/minimal-english-bible-apk.md` would mirror this | P3 | open |

### 9.6 Derivatives

| ptxprint-mcp | appbuilder-mcp | gap | priority | status |
|---|---|---|---|---|
| `derivatives/ptxprint-training-manual.md` | absent | applicable but very long-tail; only valuable once SAB master-slides surface exists upstream | n/a (parked) | closed |

### 9.7 Handoffs (informational, not parity-bearing)

ptxprint-mcp = 13 handoffs, appbuilder-mcp = 1. This delta reflects project age, not feature gap. Handoffs are not a parity dimension; flagged here only so the reader does not mistakenly count them as missing canon.

### 9.8 Encodings (DOLCHEO+H session journals — informational)

ptxprint-mcp = 15 sessions, appbuilder-mcp = 7 sessions. Same note as 9.7 — project-age delta, not parity gap.

---

## 10. Items where appbuilder-mcp is ahead (not gaps — note for symmetry)

These rows are explicitly *not* gaps. Listed so the matrix reflects reality, not just deficits.

| Aspect | Detail |
|---|---|
| `fixtures/` directory | h009, h010a, h010b, h010-full — empirical hypothesis-test fixtures with READMEs. `ptxprint-mcp` does not have an equivalent structured-fixtures pattern. |
| `BUILD.md` | 282 lines vs ptxprint-mcp's 166. Reflects the genuinely larger Android-toolchain build complexity. |
| Container `max_instances` policy capture | wrangler.jsonc has a multi-paragraph rationale block citing Open-010 and operator directive D-013. ptxprint-mcp's wrangler is sparser on container-sizing rationale. |
| `payload.ts` SAB source-kind variants | USFM zip, USX zip, Scripture Burrito zip — three input shapes; `ptxprint-mcp` payload only handles one (PTXprint config + USFM source URLs). |
| `canon/articles/keystore-reuse.md`, `canon/articles/apk-installation.md` | Domain-specific articles with no PTXprint analogue. |

---

## 11. Prioritized open-gap punch list

The following gaps remain `open`. Each row is a candidate for a single branch + commit, ordered by tier and within tier by foundational-ness.

### P1 (foundational / blocking parity claims)

1. **Add a test/ directory and the first test.** Smallest meaningful start: payload-validation tests against fixtures already in `fixtures/`. Without this, every other "validation" claim is unverifiable.
2. **Author `src/telemetry-schema.ts`** mirroring ptxprint-mcp's schema-as-source-of-truth pattern. Move BLOB/DOUBLE position assignment out of `telemetry.ts` scattered call sites and into a frozen ordered list. Export `b()`, `d()`, `buildBlobsArray()`, `buildDoublesArray()`, `rewriteSemanticSql()`, `exportSchema()`. Pin with `test/telemetry-schema.test.ts` (the schema-positions-are-forever test from ptxprint-mcp adapts almost verbatim).
3. **Add the `telemetry_schema` MCP tool** (calls `exportSchema()` from above). Once the module exists, this is a few lines in `src/index.ts`.
4. **Wire the semantic-name SQL rewriter into `telemetry_public`.** Update the tool's description to advertise it. Add a test fixture covering: bare-name SELECT → `colN AS name`; bare-name WHERE → `colN`; string literals untouched; positional refs idempotent; user `AS` aliases preserved.
5. **Add the `GET /diagnostics/schema` HTTP endpoint** — returns `exportSchema()` as JSON for external query authors who can't (or won't) call MCP tools.
6. **Author `DEPLOY.md`** — secret-set walkthrough (`CF_API_TOKEN`, `CF_ACCOUNT_ID`, optional `TELEMETRY_VERIFIED_CLIENTS`), R2 lifecycle policy command, post-deploy verification (`/health` curl), production-keystore secret pattern.
7. **Author `test/telemetry.test.ts`** mirroring ptxprint-mcp's privacy-floor / three-tier-fallback / rate-limit / dataset-allowlist coverage. Each test pins one DoD item from spec §6.

### P2 (substantial functionality with SAB analogue)

8. **Author `src/snapshot.ts`** — generic Track A snapshot infrastructure, METRICS table-driven. The 4 metric definitions from ptxprint-mcp adapt to SAB equivalents (build counts, success rate, failure-mode distribution, lifetime cumulative).
9. **Add `TELEMETRY_SNAPSHOTS` R2 bucket and `triggers.crons: ["0 0 * * 1"]`** to `wrangler.jsonc`. Coupled to (8).
10. **Add `POST /internal/snapshot/run`** route in `src/index.ts`, gated by `SNAPSHOT_BOOTSTRAP_TOKEN` secret. For one-off backfill.
11. **Author `test/snapshot.test.ts`** — date helpers, JSONL round-trip, merge-by-key idempotency, week-boundary correctness.
12. **Author `canon/governance/headless-operations.md`** — adapt ptxprint-mcp's structure to SAB-driving operations (the "what an agent needs to know to drive SAB headlessly without GUI assumptions" manual).
13. **Author `canon/articles/diagnostic-patterns.md`** — SAB diagnostic patterns (gradle errors, signing failures, missing keystore, manifest merge issues, ABI mismatches, etc.). Coupled to fixture work in `fixtures/`.
14. **Author `canon/articles/workflow-recipes.md`** — SAB build → adb-install → smoke-test cycle recipes.
15. **Author `canon/articles/snapshot-operations.md`** — operator companion to (8)–(11).
16. **Author `canon/articles/hero-metrics-and-storytelling.md`** — rationale + storytelling layer for snapshot mechanism.

### P3 (depth / polish)

17. Author remaining applicable canon articles (`agent-faq-customization`, `composition-and-templates`, `file-system-map`, `output-naming`, `progressive-customization`, `settings-cookbook`, `usfm-markers-headless`, `using-custom-fonts`).
18. Add `canon/templates/minimal-english-bible-apk.md`.
19. Add `canon/surfaces/scripture-app-builder-source.surface.{md,json}` ESE of upstream `sillsdev/scripture-app-builder`.
20. Add `scripts/e2e-walkthrough.sh` — clean install → connect → exercise every tool → teardown. Not strictly parity (ptxprint-mcp doesn't have this either), but valuable.
21. Resolve `vars.CF_ACCOUNT_ID` public-vs-secret decision; capture as one-line ADR in `canon/encodings/`.
22. README phase-status refresh once P1 + P2 close.
23. Add `src/homepage.ts` — public landing page. **Largest item by LOC (1735 in ptxprint-mcp), lowest priority** because it's polish, not infrastructure. Defer unless an external requirement surfaces.

### Joint deficiencies (flagged, not parity actions)

- No CI in either repo. Adding GitHub Actions workflow (tsc + vitest on push/PR) would benefit both; not a unilateral parity action.

---

## 12. Maintenance protocol

- **When closing a row:** change `status` from `open` → `closed`, append the closing commit SHA or PR reference to a new `closed-by` column the editor adds inline (or in a footnote at the row).
- **When discovering a new gap mid-implementation:** add a row, do *not* silently expand scope on the current branch.
- **Never delete an open row.** If a gap is reclassified (e.g. from `open` → `n/a (inapplicable)`), keep the row, change `status`, and add a one-sentence rationale in the row.
- **When ptxprint-mcp adds a feature post-this-snapshot:** update the Provenance block's reference SHA and add the new rows. The matrix tracks `appbuilder-mcp` against a moving target; keep the target pinned per snapshot.
