---
title: "Build Session Work Log — feat/canon-snapshot-operations"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.15"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for P2.15 (canon/articles/snapshot-operations.md); per-PR file"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4 P2.15"
---

# 2026-05-01 — P2.15: canon/articles/snapshot-operations.md

- **Branch:** `feat/canon-snapshot-operations`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.15):**
  - Operator companion to P2.8–P2.11. Covers: kicking off backfills,
    reading lifetime hero stats, week-boundary semantics, restoring
    snapshots after R2 lifecycle action.
  - Passes Writing Canon checklist (§2.1).
  - Dependency: P2.8–P2.11 (PR #10).

- **Files added:**
  - `canon/articles/snapshot-operations.md` — **new**, 4 recipes plus
    week-boundary semantics + observability + cross-references.
  - `docs/work-log/feat-canon-snapshot-operations.md` — **new**.

- **Verification:**
  - Recipe 1 (first-time bootstrap, 12 weeks) covers "kicking off
    backfills."
  - Recipe 2 (rerun a missed week) covers the steady-state cron-miss
    case.
  - Recipe 3 (read the lifetime hero stat via `getLifetimeHeroStat`)
    covers "reading lifetime hero stats."
  - Recipe 4 (restore after R2 lifecycle action) covers "restoring
    snapshots after R2 lifecycle action."
  - Week-boundary semantics section covers the named topic.
  - Frontmatter satisfies Writing Canon §2.1: `epoch`, `derives_from`,
    `governs`. Title names concept and stance ("Kicking Off Backfills
    and Reading Hero Stats"). Blockquote summary captures the
    operating contract.

- **Assumptions made (no operator):**
  - Recipe 3 invokes `getLifetimeHeroStat` via a `tsx` script because
    v1 does not yet expose it as an MCP tool or HTTP endpoint.
    Documented this honestly rather than papering over with a future-
    state recipe.
  - Recipe 1 uses `wrangler r2 object list` and `wrangler r2 object get`
    for sanity checks. If the operator's `wrangler` version pre-dates
    `r2 object list`, they fall back to dashboard inspection.
  - 12 weeks is the documented bootstrap default — covers AE's 90-day
    retention with a safety margin. Operators can change `weeks` per
    their actual retention; documented the `[1, 52]` clamp.
  - Recipe 4's "limitation" subsection explicitly names what cannot
    be recovered (weeks older than AE retention) and recommends
    documenting the loss rather than hiding it. Per Writing Canon
    §2.1 "no buried claims."
  - The article assumes `SNAPSHOT_BOOTSTRAP_TOKEN` is set on the
    Worker. `DEPLOY.md` §2.4 covers the set-secret command;
    cross-referenced rather than restated.

- **Canon consulted:**
  - `src/snapshot.ts` (METRICS table, lastNWeekStarts semantics,
    LifetimeHeroStat shape).
  - `src/snapshot-route.ts` (POST /internal/snapshot/run accept/reject
    states; weeks clamping; token-gate behavior).
  - `wrangler.jsonc` (cron expression, R2 binding, secret reference).
  - `DEPLOY.md` §2.4 (SNAPSHOT_BOOTSTRAP_TOKEN set walkthrough).
  - `klappy://canon/governance/telemetry-governance` (privacy floor).

- **Risks for the validator:**
  - Recipe 3 mixes a TypeScript snippet (`npx tsx -e "..."`) into a
    bash one-liner. Some shells need careful quoting; the operator
    may need to copy the snippet into a `.ts` file and run that
    instead.
  - The "ISO week starts on Monday" convention in Week-boundary
    semantics matches `weekStartFor` in `src/snapshot.ts`; if a
    future revision changes that convention (e.g. to ISO 8601
    `Sunday-as-first-day` interpretation), this article needs an
    update.
  - No worked example of `failure_mode_distribution_weekly`'s
    multi-row-per-week shape. The article mentions "may have multiple
    rows (one per failure mode)" but doesn't show a sample. The
    `klappy://canon/articles/hero-metrics-and-storytelling` article
    (P2.16) is a better home for that example.
