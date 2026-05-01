---
uri: klappy://canon/articles/snapshot-operations
title: "Snapshot Operations — Kicking Off Backfills and Reading Hero Stats"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "snapshot", "track-a", "operations", "r2", "cron", "operator-kb", "telemetry"]
epoch: E0008
date: 2026-05-01
derives_from: "src/snapshot.ts (parity row P2.8), wrangler.jsonc triggers.crons (P2.9), src/snapshot-route.ts POST /internal/snapshot/run (P2.10), klappy://canon/articles/hero-metrics-and-storytelling (P2.16)"
governs: "the operator-facing companion to the Track A snapshot mechanism: when to run a backfill, how to read the hero stat, what week-boundary semantics mean, how to restore archives after an R2 lifecycle action"
companion_to: "src/snapshot.ts, src/snapshot-route.ts, klappy://canon/articles/hero-metrics-and-storytelling"
status: working
---

# Snapshot Operations — Kicking Off Backfills and Reading Hero Stats

> The Track A snapshot mechanism runs on its own once it's deployed —
> a Monday 00:00 UTC cron snapshots the prior week into R2. The
> operator's job is the first-time bootstrap (catch up the previous
> 12 weeks against the Analytics Engine retention window), the
> occasional rerun after a missed cron, and reading the lifetime
> hero stat. This article is the operator's recipe for those four
> things.

## Summary — How the snapshot mechanism works (operator's view)

Cloudflare Analytics Engine retains telemetry for ~90 days. After
that, the raw rows are gone forever. The Track A snapshot mechanism
(`src/snapshot.ts`, parity rows P2.8–P2.11) reads aggregate weekly
metrics from AE before retention expires and writes them as JSONL
into the `appbuilder-telemetry-snapshots` R2 bucket. The R2 archive
is the lifetime memory; AE is the live tail.

Four metrics are snapshotted (`METRICS` table in `src/snapshot.ts`):

| Metric | Object key | What it counts |
|---|---|---|
| `total_builds_weekly` | `total-builds-weekly.jsonl` | All `job_terminal` events per week |
| `successful_builds_weekly` | `successful-builds-weekly.jsonl` | `job_terminal` with `failure_mode = success` |
| `failure_mode_distribution_weekly` | `failure-mode-distribution-weekly.jsonl` | One row per `(week, failure_mode)` pair |
| `apk_bytes_weekly` | `apk-bytes-weekly.jsonl` | Sum of `bytes_out` on success — the lifetime hero stat |

Each JSONL row is keyed by `(metric, week_start, failure_mode?)` for
idempotent merges; re-running a snapshot for the same week replaces
existing rows instead of duplicating.

---

## Recipe 1 — First-time bootstrap (catch up 12 weeks)

**Outcome:** All four R2 objects contain weekly aggregates back to
~12 weeks before today, populated from the live AE retention window
before any data ages out.

**Prerequisites:**

- The Worker is deployed (`DEPLOY.md` §4 complete).
- `SNAPSHOT_BOOTSTRAP_TOKEN` is set as a Worker secret
  (`wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN`; recommended: a
  long random hex from `openssl rand -hex 32`).
- The `appbuilder-telemetry-snapshots` R2 bucket exists (created
  lazily on first `put`; no operator action needed unless the
  binding name is wrong in `wrangler.jsonc`).

**Steps:**

1. Confirm the snapshot route is reachable:

   ```bash
   curl -fsSI https://<worker>/internal/snapshot/run -X POST
   # Expect HTTP 401 (no token) — the route exists, the token gate is wired.
   ```

   HTTP 503 means `SNAPSHOT_BOOTSTRAP_TOKEN` isn't set; back to
   prerequisites.

2. Run the 12-week backfill:

   ```bash
   curl -fsSL -X POST https://<worker>/internal/snapshot/run \
     -H "x-snapshot-token: <your-token>" \
     -H "content-type: application/json" \
     -d '{"weeks": 12}'
   ```

   The response is the `BootstrapResult` JSON: one
   `SnapshotRunResult` per week, each carrying per-metric
   `records_written` / `records_replaced` / `error`.

3. Confirm the R2 bucket has the four expected objects:

   ```bash
   wrangler r2 object list appbuilder-telemetry-snapshots
   ```

   Expect: `total-builds-weekly.jsonl`,
   `successful-builds-weekly.jsonl`,
   `failure-mode-distribution-weekly.jsonl`,
   `apk-bytes-weekly.jsonl`.

**Sanity check:**

```bash
wrangler r2 object get appbuilder-telemetry-snapshots/successful-builds-weekly.jsonl --file - | wc -l
# Expect: roughly 12 (one row per week of backfill, plus the trailing newline).
```

If the count is much lower than 12, AE retention may have been less
than 12 weeks at run time, or some weeks had zero `job_terminal`
events and `runSnapshot` correctly produced an empty/zero row. Open
the file and inspect.

---

## Recipe 2 — Rerun a single missed week

**Outcome:** A specific previously-missed week is snapshotted; other
weeks in R2 are unchanged.

**Prerequisites:** Recipe 1 prerequisites.

**Steps:**

1. Identify the missing week's Monday (UTC). E.g. for the week of
   2026-04-20:

   ```bash
   # Construct the body — weeks: 1 always means "the most recent
   # completed week from now()." For an arbitrary back-date, change
   # the system clock used by the call OR re-run with a sufficient
   # weeks count so the loop covers the missing week.
   ```

   The route's `weeks` parameter walks backward from "current week
   start." If the missed week is `N` weeks back, run `weeks: N`. The
   merge-by-key idempotency means re-running covers any newer weeks
   without duplication.

2. Send the request:

   ```bash
   curl -fsSL -X POST https://<worker>/internal/snapshot/run \
     -H "x-snapshot-token: <your-token>" \
     -d '{"weeks": <N>}'
   ```

3. Verify the missed week's row is present:

   ```bash
   wrangler r2 object get appbuilder-telemetry-snapshots/successful-builds-weekly.jsonl --file - \
     | jq 'select(.week_start == "2026-04-20")'
   ```

**Sanity check:**

The `jq` query above returns exactly one row (because the merge-key
includes `(metric, week_start)` and `successful_builds_weekly`
is single-dimension).

For `failure_mode_distribution_weekly`, the same week may have multiple
rows (one per failure mode); that's correct.

---

## Recipe 3 — Read the lifetime hero stat

**Outcome:** A single number — the cumulative APK byte total across
all archived weeks plus the current incomplete week — surfaced to
whoever asked (a dashboard, a status page, a Slack `#metrics` post).

**Prerequisites:**

- `getLifetimeHeroStat()` from `src/snapshot.ts` is callable. v1 does
  not yet expose this as an MCP tool or HTTP endpoint; the operator
  invokes it via `wrangler dev` REPL or by adding a small dev script.

**Steps:**

1. Confirm the archive has at least one week of data (Recipe 1 ran).

2. Invoke `getLifetimeHeroStat`. From a Node script run with `tsx`:

   ```bash
   npx tsx -e "
     import { getLifetimeHeroStat } from './src/snapshot.js';
     const env = {
       TELEMETRY_SNAPSHOTS: /* operator-supplied R2 binding */,
       CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID,
       CF_API_TOKEN: process.env.CF_API_TOKEN,
     };
     const stat = await getLifetimeHeroStat(env);
     console.log(JSON.stringify(stat, null, 2));
   "
   ```

   In production, the more typical path is exposing this via a future
   HTTP endpoint or MCP tool. Until then, the dev-script invocation
   is the documented operator path.

3. Read the response shape:

   ```json
   {
     "lifetime_apk_bytes": 1234567890,
     "archive_apk_bytes": 1230000000,
     "current_week_apk_bytes": 4567890,
     "current_week_start": "2026-04-27",
     "archive_weeks_counted": 12,
     "computed_at": "2026-05-01T12:00:00Z",
     "archive_source": "r2:appbuilder-telemetry-snapshots/apk-bytes-weekly.jsonl",
     "raw_source": "appbuilder_telemetry (analytics engine)"
   }
   ```

**Sanity check:**

`lifetime_apk_bytes == archive_apk_bytes + current_week_apk_bytes`.
The math is the contract — if it doesn't add up, suspect the AE
query in `getLifetimeHeroStat` (which uses positional `double4` for
`bytes_out` per the schema-pinning test).

---

## Recipe 4 — Restore snapshots after an R2 lifecycle action

**Outcome:** R2 archive rebuilt from AE up to the current AE retention
window, after some R2 lifecycle action (accidental delete, lifecycle
expire, bucket recreation) wiped the bucket.

**Prerequisites:** Recipe 1 prerequisites; AE retention is intact
(≤ 90 days of raw data).

**Steps:**

1. Confirm the loss. Compare expected object set with actual:

   ```bash
   wrangler r2 object list appbuilder-telemetry-snapshots
   # Expect 4 objects; missing rows fall under "lost" cases.
   ```

2. Pick the recovery range. For full restoration up to AE's retention
   window:

   ```bash
   curl -fsSL -X POST https://<worker>/internal/snapshot/run \
     -H "x-snapshot-token: <your-token>" \
     -d '{"weeks": 12}'
   ```

   `weeks` is clamped to `[1, 52]` server-side; values outside that
   range are coerced. 12 covers the AE retention window with a safety
   margin.

3. Repeat Recipe 1 step 3 to confirm the four objects are back.

**Sanity check:**

```bash
# All four objects exist:
wrangler r2 object list appbuilder-telemetry-snapshots | grep -c "weekly.jsonl"
# Expect: 4
```

**Limitation:** weeks older than the AE retention window cannot be
recovered — those rows are gone permanently. The lifetime hero stat
will read `archive_weeks_counted` lower than before, and
`lifetime_apk_bytes` will undercount accordingly. This is the failure
mode the snapshot mechanism is designed to *prevent*, not recover
from. Document the loss; do not hide it.

---

## Week-boundary semantics

- Weeks are ISO weeks: Monday 00:00 UTC → next Monday 00:00 UTC.
- The cron fires Mondays 00:00 UTC; the scheduled handler snapshots
  `addDays(weekStartFor(now), -7)` → the week that just ended.
- `lastNWeekStarts(now, n)` returns N COMPLETED weeks, oldest first.
  The current incomplete week is excluded; that's why `getLifetimeHeroStat`
  composites archive + current-week-from-AE for the lifetime number.
- Sundays roll BACK to the prior Monday — a snapshot run at 23:55 UTC
  Sunday and at 00:05 UTC Monday land on different week-starts. The
  cron timing avoids this race for the steady-state path; the
  bootstrap path (`POST /internal/snapshot/run`) inherits the same
  semantics from `lastNWeekStarts`.

## Observability and limits

- The snapshot run writes telemetry per the
  `klappy://canon/governance/telemetry-governance` privacy floor —
  metric names and counts only; no payload contents.
- A per-metric `error` field in the `BootstrapResult` JSON does NOT
  abort other metrics — each runs independently. A scheduled run that
  fails on one metric still succeeds for the others.
- AE rate-limit interactions: the snapshot module bypasses the
  `validateDatasetAllowlist` rate-limit in `src/telemetry.ts` (it is
  the writer, not a public reader). Operator does not need a
  per-consumer rate budget for snapshot runs.

## Cross-references

- `src/snapshot.ts` — the runtime module; this article is its
  operator companion.
- `src/snapshot-route.ts` — the `POST /internal/snapshot/run` handler.
- `klappy://canon/articles/hero-metrics-and-storytelling` — the
  rationale layer (why these four metrics; what story they tell).
- `klappy://canon/governance/telemetry-governance` — privacy floor;
  what NEVER appears in a snapshot row.
- `DEPLOY.md` §2.4 — secret-set walkthrough for
  `SNAPSHOT_BOOTSTRAP_TOKEN`.
