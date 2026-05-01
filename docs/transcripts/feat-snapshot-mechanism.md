# Transcript — feat/snapshot-mechanism

> Evidence for parity rows P2.8 (`src/snapshot.ts`), P2.9 (R2 bucket + cron),
> P2.10 (`POST /internal/snapshot/run`), and P2.11 (`test/snapshot.test.ts`).
> Path is referenced from the PR per `docs/parity-spec.md` §2 evidence
> requirement #4.

## P2.8 — Module shape

`src/snapshot.ts` mirrors `klappy/ptxprint-mcp/src/snapshot.ts` @
`4271d700ffd290034190cc0751726fdd29e5fe0c` verbatim. Module API:

```ts
export interface SnapshotRecord { ... }
export type AeRow = Record<string, unknown>;
export interface SnapshotMetric { ... }
export interface SnapshotEnv { ... }
export interface SnapshotRunResult { ... }
export interface BootstrapResult { ... }
export interface LifetimeHeroStat { ... }

export const METRICS: SnapshotMetric[] = [
  // 1. total_builds_weekly      — "build count"  (all job_terminal events)
  // 2. successful_builds_weekly — "successes"    (combined with #1 → success rate)
  // 3. failure_mode_distribution_weekly — per-mode breakdown
  // 4. apk_bytes_weekly         — "lifetime hero stat" (sum bytes_out on success)
];

export function weekStartFor(d: Date): string;
export function toIsoDate(d: Date): string;
export function addDays(isoDate: string, days: number): string;
export function lastNWeekStarts(now: Date, n: number): string[];

export async function runAnalyticsEngineSql(env, sql, fetchFn?);
export async function readSnapshotJsonl(env, objectKey): Promise<SnapshotRecord[]>;
export function parseJsonl(text: string): SnapshotRecord[];
export function serializeJsonl(records: SnapshotRecord[]): string;
export function mergeSnapshots(existing, fresh): SnapshotRecord[];
export async function writeSnapshotJsonl(env, objectKey, records);

export async function runSnapshot(env, weekStart, options?): Promise<SnapshotRunResult>;
export async function runSnapshotForWeeks(env, weekStarts, options?): Promise<BootstrapResult>;
export async function getLifetimeHeroStat(env, options?): Promise<LifetimeHeroStat>;
```

SAB-specific deltas vs ptxprint-mcp: dataset is `appbuilder_telemetry`;
tool_name filter is `submit_build`; hero metric is APK bytes
(`double4 = bytes_out`) instead of PDF pages.

## P2.9 — `wrangler.jsonc` bindings

```jsonc
"r2_buckets": [
  { "binding": "OUTPUTS", "bucket_name": "appbuilder-outputs" },
  { "binding": "TELEMETRY_SNAPSHOTS", "bucket_name": "appbuilder-telemetry-snapshots" }
],

"triggers": {
  "crons": ["0 0 * * 1"]
}
```

`wrangler deploy --dry-run` is the validator's confirmation; the build
session does not have CF auth to run it.

## P2.10 — `POST /internal/snapshot/run` (synthetic transcript)

Captured by invoking `handleSnapshotRun` directly with synthetic
`Request` objects (the route handler does not use any cloudflare:*
imports; the dispatcher delegates to it from `src/index.ts`):

```
$ npx tsx -e "..."

# Rejected without token
HTTP/1.1 401
content-type: application/json
{"error":"unauthorized"}

# Accepted with token, weeks=1
HTTP/1.1 200
content-type: application/json
{
  "weeks_processed": 1,
  "ok": true,
  "metric_count": 4,
  "week_start": "2026-04-20"
}
```

(Full POST response body is the `BootstrapResult` shape with one
`SnapshotRunResult` per requested week, each carrying per-metric
`records_written` / `records_replaced` / `error`.)

### Live wrangler-dev curl deferral

A live `wrangler dev` curl transcript requires CF secrets the build
session does not hold. The vitest tests in `test/snapshot.test.ts`
exercise the exact handler the dispatcher invokes (with a fake R2 + a
mocked Analytics Engine fetch); the validator session can run the
identical curl against `wrangler dev` for live confirmation.

## P2.11 — Test summary

```
 RUN  v4.1.5 /home/user/appbuilder-mcp


 Test Files  2 passed (2)
      Tests  45 passed (45)
```

(13 payload tests from merged P1.1 + 32 snapshot tests from this PR.)

Test coverage by spec acceptance item:

| Spec item | Suite | Tests |
|---|---|---|
| Date helpers | `weekStartFor`, `toIsoDate / addDays`, `lastNWeekStarts` | 4 + 2 + 2 |
| JSONL round-trip | `parseJsonl / serializeJsonl (round-trip)` | 4 |
| Merge-by-key idempotency | `mergeSnapshots (idempotency)` | 6 |
| Week-boundary correctness | `weekStartFor` (Sun-rolls-back, month/year boundaries) | included in 4 above |
| METRICS sanity (P2.8) | `METRICS table` | 3 |
| `runSnapshot` integration | `runSnapshot (integration)` | 3 |
| `runSnapshotForWeeks` | `runSnapshotForWeeks` | 1 |
| Route handler (P2.10) | `handleSnapshotRun (POST /internal/snapshot/run)` | 7 |

## Reproducer

```bash
git checkout feat/snapshot-mechanism
npm install
npm test           # 45 passed
npm run tsc        # exit 0
```
