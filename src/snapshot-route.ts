/**
 * snapshot-route.ts — POST /internal/snapshot/run handler.
 *
 * One-off bootstrap path for the Track A weekly snapshot mechanism. The
 * scheduled (cron) handler is the steady-state path; this route is for
 * backfills (e.g. operator runs the last 12 weeks once after first
 * deploy) and ad-hoc reruns.
 *
 * Gated by the `SNAPSHOT_BOOTSTRAP_TOKEN` secret. Matches a header
 * `x-snapshot-token` or a JSON body `{ token: "..." }`. Without the
 * secret on the env, every request rejects with 503.
 *
 * Body (optional):
 *   { weeks?: number, token?: string }
 *
 * Default: snapshot the last completed week (weeks=1).
 *
 * Lives in its own module (not inline in src/index.ts) so the route
 * can be unit-tested without pulling in the cloudflare:* / agents/mcp
 * imports the worker entry requires.
 *
 * Authority:
 *   docs/parity-spec.md §4 P2.10
 *   klappy://canon/articles/snapshot-operations
 */

import {
  runSnapshotForWeeks,
  lastNWeekStarts,
  type SnapshotEnv,
  type BootstrapResult,
} from "./snapshot.js";

export interface SnapshotRouteEnv extends SnapshotEnv {
  SNAPSHOT_BOOTSTRAP_TOKEN?: string;
}

/**
 * Try to handle a request as `POST /internal/snapshot/run`. Returns the
 * JSON response on a match; returns `null` when the request does not
 * match the route (the caller continues route dispatch).
 */
export async function handleSnapshotRun(
  req: Request,
  env: SnapshotRouteEnv,
  options: { now?: Date; fetchFn?: typeof fetch } = {},
): Promise<Response | null> {
  if (req.method !== "POST") return null;
  const url = new URL(req.url);
  if (url.pathname !== "/internal/snapshot/run") return null;

  // Token gate — require the env secret AND a matching token from the caller.
  const expected = env.SNAPSHOT_BOOTSTRAP_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "snapshot bootstrap not configured" },
      { status: 503 },
    );
  }

  const headerToken = req.headers.get("x-snapshot-token") ?? "";
  let body: { weeks?: number; token?: string } = {};
  try {
    body = (await req.json()) as { weeks?: number; token?: string };
  } catch {
    body = {};
  }
  const bodyToken = typeof body?.token === "string" ? body.token : "";
  const provided = headerToken || bodyToken;

  if (!provided || provided !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const weeksRaw = typeof body?.weeks === "number" ? body.weeks : 1;
  const weeks = Math.min(Math.max(Math.floor(weeksRaw), 1), 52);
  const weekStarts = lastNWeekStarts(options.now ?? new Date(), weeks);

  const result: BootstrapResult = await runSnapshotForWeeks(env, weekStarts, {
    fetchFn: options.fetchFn,
  });

  return Response.json(result, { status: result.ok ? 200 : 500 });
}
