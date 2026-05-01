---
title: "Build Session Work Log — feat/canon-hero-metrics"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.16"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for P2.16 (canon/articles/hero-metrics-and-storytelling.md); per-PR file"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4 P2.16"
---

# 2026-05-01 — P2.16: canon/articles/hero-metrics-and-storytelling.md

- **Branch:** `feat/canon-hero-metrics`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.16):**
  - Rationale layer for P2.8's `METRICS` table — why those four
    metrics, what story they tell, how they age.
  - Passes Writing Canon checklist (§2.1).
  - Dependency: P2.8 (PR #10).

- **Files added:**
  - `canon/articles/hero-metrics-and-storytelling.md` — **new**, five
    sections (§1 why exactly four, §2 stories the metrics tell, §3
    how the metrics age, §4 failure modes the snapshot mechanism
    prevents, §5 when to add a fifth metric).
  - `docs/work-log/feat-canon-hero-metrics.md` — **new**.

- **Verification:**
  - Each of the four metrics has a one-sentence stakeholder-question
    framing in the Summary, an extended story-and-aging treatment in
    §2, and an aging table entry in §3.
  - §1 explicitly answers "why four, not five" (cache hit rate
    deferred for two reasons; document captures both).
  - §5 names the failed-for-now alternatives (cache hit rate,
    per-consumer count, duration percentiles) with their reasons —
    "no buried claims" per §2.1.
  - Frontmatter satisfies Writing Canon §2.1: `epoch`, `derives_from`,
    `governs`. Title names concept and stance ("Why These Four, What
    They Tell, How They Age"). Blockquote summary captures the full
    operating contract.

- **Assumptions made (no operator):**
  - Wrote rationale-layer prose, not procedure. The companion
    `snapshot-operations.md` (P2.15) handles the procedural layer;
    this article is the "why" half. Per
    `klappy://canon/principles/dry-canon-says-it-once` neither
    article restates the other's content.
  - Picked APK bytes as the SAB hero stat, paralleling pages typeset
    in ptxprint-mcp. Documented the rationale in §2.4 (production-
    shaped builds weighted higher than test-shaped builds).
  - Included §3's aging-cost table because raw byte sizes give a
    concrete answer to "is the archive ever going to be a problem?"
    (Answer: no — well under 1 MB after 5 years.) Rationale articles
    that hand-wave on cost don't help the operator; this one
    quantifies.
  - §4 ("failure modes the snapshot mechanism prevents") explicitly
    inverts the framing: instead of describing what the mechanism
    *does*, lists what it *prevents the project from suffering from*.
    This framing matters because the rationale must justify the
    investment.

- **Canon consulted:**
  - `src/snapshot.ts` METRICS table (verified the four metrics align
    with what the article describes).
  - `src/snapshot.ts` `getLifetimeHeroStat` (referenced in §2.4).
  - `klappy://canon/articles/snapshot-operations` (P2.15, this
    article's procedural counterpart).
  - `klappy://canon/governance/telemetry-governance` (privacy floor
    referenced in §5).
  - `klappy://canon/articles/failure-mode-taxonomy` (referenced in
    §2.3 for the canonical `failure_mode` value set).
  - `src/telemetry-schema.ts` (referenced in cross-references for
    the `double4 = bytes_out` mapping).

- **Risks for the validator:**
  - The article makes a claim about archive size ("well under 1 MB
    after 5 years"). The math: 4 metrics × 260 weeks × ~200 B
    average per row ≈ 200 KB. Comfortable margin, but the validator
    may want to spot-check by computing per-row JSONL sizes against
    a real run.
  - §4 names "classifier drift hiding history" as a prevented
    failure mode. The actual prevention is "the archive's prior
    weeks reflect the classifier as it was" — i.e. the snapshot
    captures it at write time, so future classifier changes don't
    retroactively rewrite history. The wording stresses the
    consumer's interpretive responsibility, which is the right
    framing.
  - §5 explicitly defers cache-hit-rate, per-consumer-count, and
    duration-percentile metrics. If a future stakeholder requests
    one, the article documents the threshold for promotion ("survives
    the 'would I tell this number to a stakeholder?' test") and the
    mechanical path (append to METRICS).

- **Build-session reflection:** P2.16 is the last P2 row. After the
  validator session accepts PRs #7, #8, #9, #10, #11, #12, #13, #14,
  and #15, the build session reaches the spec §7.1 "parity met"
  success stop condition. P3 rows are deferrable per spec §5.
  Build session is at the natural end of the P1+P2 mission.
