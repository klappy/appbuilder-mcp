---
title: "Build Session Work Log — feat/canon-headless-operations"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.12"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for P2.12 (canon/governance/headless-operations.md); one file per PR per the SPEC-AMENDMENT-shared-state-conflicts pattern"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4 P2.12"
---

# 2026-05-01 — P2.12: canon/governance/headless-operations.md

- **Branch:** `feat/canon-headless-operations`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.12):** file exists at
  `canon/governance/headless-operations.md`; adapts ptxprint-mcp's Parts
  0–12 + Provenance structure to driving SAB headlessly (APK building,
  keystore handling, build artifact retrieval, gradle cache implications,
  ABI selection, signing); no verbatim copy from PTXprint domain; passes
  Writing Canon checklist (§2.1).

- **Files added/modified:**
  - `canon/governance/headless-operations.md` — **new**, ~290 lines.
    Parts 0–12 + Provenance + Open gaps. Self-contained operational KB.
    Frontmatter: `epoch: E0008`, `derives_from`/`governs` per Writing
    Canon §2.1.

- **Verification:**
  - File renders with scannable headers; blockquote summary at the top
    captures the full operating contract in three paragraphs.
  - Cross-references resolve: `canon/specs/appbuilder-mcp-v1-spec.md`,
    `canon/articles/payload-construction.md`, `canon/articles/cli-reference.md`,
    `canon/articles/bundled-debug-keystore.md`,
    `canon/articles/keystore-reuse.md`, `canon/articles/apk-installation.md`,
    `canon/handoffs/burrito-tag-handoff.md`, `wrangler.jsonc`,
    `src/telemetry-schema.ts`, `DEPLOY.md`. (Articles
    `failure-mode-taxonomy`, `diagnostic-patterns`, `workflow-recipes`
    are referenced; the latter two are P2.13/P2.14 follow-up rows.)

- **Assumptions made (no operator):**
  - **Bookkeeping pattern:** per-PR work-log file at
    `docs/work-log/feat-canon-headless-operations.md`, no edits to
    `docs/parity-matrix.md` — adopting the SPEC-AMENDMENT pattern from
    `BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md`.
  - **Structure choice:** ptxprint-mcp's *current* `headless-operations.md`
    is a chapter-map index (the original Parts 0–12 monolith was split
    into chapter articles in session 6 H-011). Spec §4 P2.12 explicitly
    asks for "Parts 0–12 + Provenance," so this PR ships the self-
    contained Parts 0–12 form rather than the chapter-map form. Future
    work may split this monolith into SAB-specific chapter articles in
    a follow-up session, mirroring the H-011 evolution.
  - **No PTXprint-domain copy:** the doc is fully SAB-flavored. No
    references to TeX / XeTeX / piclist / adjlist / config inheritance
    / fonts (PTXprint's domain). Uses SAB-specific concepts: APK,
    Gradle, keystores (JKS), Android ABIs, signing, USFM/USX/burrito
    sources, manifest merge. Each Part references existing SAB-specific
    canon articles where they cover the topic in depth.
  - **Cross-references include forward-looking pointers.** Parts 11–12
    cite `klappy://canon/articles/diagnostic-patterns` and
    `klappy://canon/articles/workflow-recipes`; both land in P2.13 and
    P2.14 respectively. The validator should confirm the URI shape
    after those articles ship — the link target paths follow the
    canonical naming convention.
  - **Open gaps** section enumerates 6 v1-out-of-scope items (per-ABI
    APKs, AAB, PWA / IPA, diglot, Play Console asset uploads, project
    state persistence). Surfacing these honestly is the spec §2.1
    "no buried claims" requirement; the agent should not pretend
    the v1 surface covers them.

- **Canon consulted:**
  - `klappy/ptxprint-mcp/canon/governance/headless-operations.md`
    @ `4271d70` (structural mirror — Parts 0–12 + Provenance shape only).
  - `canon/specs/appbuilder-mcp-v1-spec.md` (full read).
  - `wrangler.jsonc` (Container instance type, max_instances, sleepAfter
    references).
  - `src/telemetry-schema.ts` (privacy floor + position-is-forever
    references).
  - `DEPLOY.md` §6.3 (operator-hygiene wording for Part 5 keystores).

- **Risks for the validator:**
  - **Forward-link rot:** if P2.13 or P2.14 ship under different file
    names than the convention predicts, the cross-references in Parts
    11–12 will become 404. The validator should grep the doc for
    `klappy://canon/articles/diagnostic-patterns` and
    `klappy://canon/articles/workflow-recipes` against the actual
    landed paths.
  - **Build-lifecycle state machine in Part 7** is hand-drawn ASCII;
    if the v1 spec adds new states (e.g. `paused`), this needs a
    refresh. The validator should diff against
    `canon/specs/appbuilder-mcp-v1-spec.md` §7 Failure modes.
  - **`BUILD_TIMEOUT_DEFAULT` value (1800 s)** quoted in Part 7 reflects
    the current `wrangler.jsonc`. If that var ever changes, this doc
    needs an update; consider linking by URI rather than literal value
    in a future revision.
