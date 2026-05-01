import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  weekStartFor,
  toIsoDate,
  addDays,
  lastNWeekStarts,
  parseJsonl,
  serializeJsonl,
  mergeSnapshots,
  runSnapshot,
  runSnapshotForWeeks,
  METRICS,
  type SnapshotRecord,
  type SnapshotEnv,
  type R2BucketLike,
  type R2ObjectLike,
} from "../src/snapshot.js";
import { handleSnapshotRun } from "../src/snapshot-route.js";

// Spec acceptance (docs/parity-spec.md §4 P2.11):
//   - date helpers
//   - JSONL round-trip
//   - merge-by-key idempotency
//   - week-boundary correctness
//
// Each subtest names the snapshot.ts export it exercises. The METRICS table
// is asserted as a sanity check on the §4 P2.8 claim "at least four metrics".

// ────────────────────────────────────────────────────────────
//  Date helpers — week-boundary correctness
// ────────────────────────────────────────────────────────────

describe("weekStartFor", () => {
  it("returns the same Monday for any day in the ISO week", () => {
    // Monday 2026-04-27 through Sunday 2026-05-03 all map to 2026-04-27.
    const days = [
      "2026-04-27", // Mon
      "2026-04-28", // Tue
      "2026-04-29", // Wed
      "2026-04-30", // Thu
      "2026-05-01", // Fri
      "2026-05-02", // Sat
      "2026-05-03", // Sun
    ];
    for (const d of days) {
      expect(weekStartFor(new Date(`${d}T12:34:56Z`))).toBe("2026-04-27");
    }
  });

  it("rolls Sunday back to the prior Monday (not forward)", () => {
    expect(weekStartFor(new Date("2026-05-03T00:00:00Z"))).toBe("2026-04-27");
  });

  it("handles month boundaries", () => {
    // Sat 2026-05-30 → Mon 2026-05-25
    expect(weekStartFor(new Date("2026-05-30T00:00:00Z"))).toBe("2026-05-25");
    // Sun 2026-08-30 → Mon 2026-08-24
    expect(weekStartFor(new Date("2026-08-30T00:00:00Z"))).toBe("2026-08-24");
  });

  it("handles year boundaries", () => {
    // Wed 2026-12-30 → Mon 2026-12-28
    expect(weekStartFor(new Date("2026-12-30T00:00:00Z"))).toBe("2026-12-28");
    // Sat 2027-01-02 → Mon 2026-12-28
    expect(weekStartFor(new Date("2027-01-02T00:00:00Z"))).toBe("2026-12-28");
  });
});

describe("toIsoDate / addDays", () => {
  it("toIsoDate zero-pads month and day", () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01-01");
    expect(toIsoDate(new Date(Date.UTC(2026, 8, 9)))).toBe("2026-09-09");
  });

  it("addDays moves forward and backward across month/year boundaries", () => {
    expect(addDays("2026-04-27", 7)).toBe("2026-05-04");
    expect(addDays("2026-04-27", -7)).toBe("2026-04-20");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
    expect(addDays("2027-01-04", -5)).toBe("2026-12-30");
  });
});

describe("lastNWeekStarts", () => {
  it("returns N week starts in oldest-first order", () => {
    const now = new Date("2026-05-01T12:00:00Z"); // Friday
    const weeks = lastNWeekStarts(now, 4);
    expect(weeks).toEqual([
      "2026-03-30",
      "2026-04-06",
      "2026-04-13",
      "2026-04-20",
    ]);
  });

  it("excludes the current (in-progress) week", () => {
    const now = new Date("2026-05-01T12:00:00Z"); // Friday in week of 2026-04-27
    const weeks = lastNWeekStarts(now, 1);
    // The most recent COMPLETED week is the prior Monday's week.
    expect(weeks).toEqual(["2026-04-20"]);
  });
});

// ────────────────────────────────────────────────────────────
//  JSONL round-trip
// ────────────────────────────────────────────────────────────

describe("parseJsonl / serializeJsonl (round-trip)", () => {
  const records: SnapshotRecord[] = [
    {
      metric: "successful_builds_weekly",
      week_start: "2026-04-27",
      value: 42,
      snapshotted_at: "2026-05-04T00:00:00Z",
      source: "appbuilder_telemetry",
    },
    {
      metric: "failure_mode_distribution_weekly",
      week_start: "2026-04-27",
      value: 7,
      snapshotted_at: "2026-05-04T00:00:00Z",
      source: "appbuilder_telemetry",
      failure_mode: "soft",
    },
  ];

  it("serialize -> parse returns equivalent records", () => {
    const text = serializeJsonl(records);
    expect(parseJsonl(text)).toEqual(records);
  });

  it("serializeJsonl produces newline-terminated JSONL", () => {
    const text = serializeJsonl(records);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.split("\n").filter((l) => l.length > 0)).toHaveLength(2);
  });

  it("parseJsonl tolerates blank lines and skips malformed rows", () => {
    const text = '{"metric":"x","week_start":"2026-04-27","value":1,"snapshotted_at":"t","source":"s"}\n\nnot-json\n{"metric":"y","week_start":"2026-04-27","value":2,"snapshotted_at":"t","source":"s"}\n';
    const parsed = parseJsonl(text);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((r) => r.metric)).toEqual(["x", "y"]);
  });

  it("parseJsonl returns [] on empty input", () => {
    expect(parseJsonl("")).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
//  Merge-by-key idempotency
// ────────────────────────────────────────────────────────────

describe("mergeSnapshots (idempotency)", () => {
  const fresh = (week: string, mode?: string, value = 1): SnapshotRecord => ({
    metric: mode ? "failure_mode_distribution_weekly" : "successful_builds_weekly",
    week_start: week,
    value,
    snapshotted_at: "2026-05-04T00:00:00Z",
    source: "appbuilder_telemetry",
    ...(mode ? { failure_mode: mode } : {}),
  });

  it("replaces existing records with the same (metric, week, failure_mode) key", () => {
    const existing = [fresh("2026-04-27", undefined, 5)];
    const refreshed = [fresh("2026-04-27", undefined, 8)];
    const merged = mergeSnapshots(existing, refreshed);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe(8);
  });

  it("preserves records with different keys", () => {
    const existing = [
      fresh("2026-04-13", undefined, 3),
      fresh("2026-04-20", undefined, 4),
    ];
    const refreshed = [fresh("2026-04-27", undefined, 5)];
    const merged = mergeSnapshots(existing, refreshed);
    expect(merged).toHaveLength(3);
    expect(merged.map((r) => r.value)).toEqual([3, 4, 5]);
  });

  it("treats failure_mode as part of the key (per-mode rows are independent)", () => {
    const existing = [
      fresh("2026-04-27", "soft", 1),
      fresh("2026-04-27", "hard", 2),
    ];
    const refreshed = [fresh("2026-04-27", "soft", 9)];
    const merged = mergeSnapshots(existing, refreshed);
    expect(merged).toHaveLength(2);
    const soft = merged.find((r) => r.failure_mode === "soft");
    const hard = merged.find((r) => r.failure_mode === "hard");
    expect(soft?.value).toBe(9);
    expect(hard?.value).toBe(2);
  });

  it("is idempotent when fresh exactly equals existing", () => {
    const existing = [fresh("2026-04-27", undefined, 5)];
    const refreshed = [fresh("2026-04-27", undefined, 5)];
    const merged = mergeSnapshots(existing, refreshed);
    expect(merged).toEqual(refreshed);
  });

  it("is a no-op when fresh is empty", () => {
    const existing = [fresh("2026-04-27", undefined, 5)];
    const merged = mergeSnapshots(existing, []);
    expect(merged).toEqual(existing);
  });

  it("sorts by (week_start ASC, failure_mode ASC) for stable diffs", () => {
    const existing = [fresh("2026-04-27", "hard", 2)];
    const refreshed = [
      fresh("2026-04-13", undefined, 3),
      fresh("2026-04-20", "soft", 4),
      fresh("2026-04-27", "soft", 5),
    ];
    const merged = mergeSnapshots(existing, refreshed);
    expect(merged.map((r) => `${r.week_start}|${r.failure_mode ?? ""}`)).toEqual([
      "2026-04-13|",
      "2026-04-20|soft",
      "2026-04-27|hard",
      "2026-04-27|soft",
    ]);
  });
});

// ────────────────────────────────────────────────────────────
//  METRICS sanity (P2.8 acceptance)
// ────────────────────────────────────────────────────────────

describe("METRICS table", () => {
  it("declares at least 4 metrics per spec §4 P2.8", () => {
    expect(METRICS.length).toBeGreaterThanOrEqual(4);
  });

  it("every metric has a unique name and a unique objectKey", () => {
    const names = new Set(METRICS.map((m) => m.name));
    const keys = new Set(METRICS.map((m) => m.objectKey));
    expect(names.size).toBe(METRICS.length);
    expect(keys.size).toBe(METRICS.length);
  });

  it("every SQL template references only the appbuilder_telemetry dataset", () => {
    for (const m of METRICS) {
      const sql = m.buildSql("2026-04-27", "2026-05-04");
      expect(sql).toMatch(/FROM\s+appbuilder_telemetry/i);
    }
  });
});

// ────────────────────────────────────────────────────────────
//  runSnapshot integration (with in-memory R2 and mocked AE)
// ────────────────────────────────────────────────────────────

class FakeR2 implements R2BucketLike {
  store = new Map<string, string>();

  async get(key: string): Promise<R2ObjectLike | null> {
    if (!this.store.has(key)) return null;
    const text = this.store.get(key)!;
    return { text: async () => text };
  }

  async put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<unknown> {
    if (typeof value !== "string") throw new Error("FakeR2 only supports string values");
    this.store.set(key, value);
    return undefined;
  }

  async list(): Promise<{ objects: Array<{ key: string }> }> {
    return { objects: [...this.store.keys()].map((key) => ({ key })) };
  }
}

describe("runSnapshot (integration)", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("writes one R2 object per metric and reports records_written", async () => {
    const r2 = new FakeR2();
    const env: SnapshotEnv = {
      TELEMETRY_SNAPSHOTS: r2,
      CF_ACCOUNT_ID: "acct",
      CF_API_TOKEN: "tok",
    };

    const fetchFn = vi.fn(async () =>
      // Each AE call returns a single row with value=1; for the
      // failure_mode metric, return one row per mode.
      new Response(
        JSON.stringify({
          data: [{ value: 1, failure_mode: "success" }],
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await runSnapshot(env, "2026-04-27", {
      snapshottedAt: "2026-05-04T00:00:00Z",
      fetchFn,
    });

    expect(result.ok).toBe(true);
    expect(result.metrics.length).toBe(METRICS.length);
    // Every successful metric should have records_written >= 1.
    for (const m of result.metrics) {
      expect(m.error).toBeUndefined();
      expect(m.records_written).toBeGreaterThanOrEqual(1);
    }
    // R2 should have one object per metric.
    expect(r2.store.size).toBe(METRICS.length);
  });

  it("running runSnapshot twice for the same week produces no duplicate rows", async () => {
    const r2 = new FakeR2();
    const env: SnapshotEnv = {
      TELEMETRY_SNAPSHOTS: r2,
      CF_ACCOUNT_ID: "acct",
      CF_API_TOKEN: "tok",
    };
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 5, failure_mode: "success" }] })),
    ) as unknown as typeof fetch;

    await runSnapshot(env, "2026-04-27", {
      snapshottedAt: "2026-05-04T00:00:00Z",
      fetchFn,
    });
    await runSnapshot(env, "2026-04-27", {
      snapshottedAt: "2026-05-04T00:00:00Z",
      fetchFn,
    });

    // Read every metric's JSONL and count rows for week 2026-04-27.
    for (const m of METRICS) {
      const text = r2.store.get(m.objectKey) ?? "";
      const records = parseJsonl(text).filter(
        (r) => r.week_start === "2026-04-27",
      );
      // Each metric produces exactly one record per (week, failure_mode) key.
      // For the failure_mode_distribution metric we mocked one mode → 1 row.
      expect(records.length).toBe(1);
    }
  });

  it("captures per-metric errors without aborting other metrics", async () => {
    const r2 = new FakeR2();
    const env: SnapshotEnv = {
      TELEMETRY_SNAPSHOTS: r2,
      CF_ACCOUNT_ID: "acct",
      CF_API_TOKEN: "tok",
    };
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call++;
      if (call === 1) {
        // First metric: AE returns 500 → error captured.
        return new Response("server error", { status: 500 });
      }
      return new Response(JSON.stringify({ data: [{ value: 1, failure_mode: "success" }] }));
    }) as unknown as typeof fetch;

    const result = await runSnapshot(env, "2026-04-27", {
      snapshottedAt: "2026-05-04T00:00:00Z",
      fetchFn,
    });

    expect(result.ok).toBe(false);
    expect(result.metrics[0].error).toMatch(/analytics engine returned 500/);
    // All other metrics still ran.
    expect(result.metrics.slice(1).every((m) => !m.error)).toBe(true);
  });
});

describe("runSnapshotForWeeks", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("processes each week sequentially and returns a per-week result", async () => {
    const r2 = new FakeR2();
    const env: SnapshotEnv = {
      TELEMETRY_SNAPSHOTS: r2,
      CF_ACCOUNT_ID: "acct",
      CF_API_TOKEN: "tok",
    };
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 1, failure_mode: "success" }] })),
    ) as unknown as typeof fetch;

    const result = await runSnapshotForWeeks(
      env,
      ["2026-04-13", "2026-04-20", "2026-04-27"],
      { snapshottedAt: "2026-05-04T00:00:00Z", fetchFn },
    );

    expect(result.weeks_processed).toBe(3);
    expect(result.results.map((r) => r.week_start)).toEqual([
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
    expect(result.ok).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
//  POST /internal/snapshot/run route
// ────────────────────────────────────────────────────────────

describe("handleSnapshotRun (POST /internal/snapshot/run)", () => {
  const url = "https://appbuilder-mcp.example.com/internal/snapshot/run";

  it("returns null on non-POST methods (so the dispatcher falls through)", async () => {
    const res = await handleSnapshotRun(
      new Request(url, { method: "GET" }),
      { SNAPSHOT_BOOTSTRAP_TOKEN: "secret" },
    );
    expect(res).toBeNull();
  });

  it("returns null on a different path (so the dispatcher falls through)", async () => {
    const res = await handleSnapshotRun(
      new Request("https://appbuilder-mcp.example.com/internal/other", {
        method: "POST",
      }),
      { SNAPSHOT_BOOTSTRAP_TOKEN: "secret" },
    );
    expect(res).toBeNull();
  });

  it("returns 503 when SNAPSHOT_BOOTSTRAP_TOKEN is not configured", async () => {
    const res = await handleSnapshotRun(
      new Request(url, { method: "POST", body: "{}" }),
      {},
    );
    expect(res?.status).toBe(503);
  });

  it("returns 401 without the token", async () => {
    const res = await handleSnapshotRun(
      new Request(url, { method: "POST", body: "{}" }),
      { SNAPSHOT_BOOTSTRAP_TOKEN: "secret" },
    );
    expect(res?.status).toBe(401);
  });

  it("returns 401 with the wrong token", async () => {
    const res = await handleSnapshotRun(
      new Request(url, {
        method: "POST",
        headers: { "x-snapshot-token": "wrong" },
        body: "{}",
      }),
      { SNAPSHOT_BOOTSTRAP_TOKEN: "secret" },
    );
    expect(res?.status).toBe(401);
  });

  it("accepts the token via header and runs the snapshot", async () => {
    const r2 = new FakeR2();
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 1, failure_mode: "success" }] })),
    ) as unknown as typeof fetch;

    const res = await handleSnapshotRun(
      new Request(url, {
        method: "POST",
        headers: { "x-snapshot-token": "secret" },
        body: JSON.stringify({ weeks: 2 }),
      }),
      {
        SNAPSHOT_BOOTSTRAP_TOKEN: "secret",
        TELEMETRY_SNAPSHOTS: r2,
        CF_ACCOUNT_ID: "acct",
        CF_API_TOKEN: "tok",
      },
      { now: new Date("2026-05-01T12:00:00Z"), fetchFn },
    );

    expect(res?.status).toBe(200);
    const body = (await res!.json()) as { weeks_processed: number; ok: boolean };
    expect(body.weeks_processed).toBe(2);
    expect(body.ok).toBe(true);
  });

  it("clamps weeks parameter into [1, 52]", async () => {
    const r2 = new FakeR2();
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 1, failure_mode: "success" }] })),
    ) as unknown as typeof fetch;

    const res = await handleSnapshotRun(
      new Request(url, {
        method: "POST",
        headers: { "x-snapshot-token": "secret" },
        body: JSON.stringify({ weeks: 0 }),
      }),
      {
        SNAPSHOT_BOOTSTRAP_TOKEN: "secret",
        TELEMETRY_SNAPSHOTS: r2,
        CF_ACCOUNT_ID: "acct",
        CF_API_TOKEN: "tok",
      },
      { now: new Date("2026-05-01T12:00:00Z"), fetchFn },
    );

    expect(res?.status).toBe(200);
    const body = (await res!.json()) as { weeks_processed: number };
    // weeks=0 clamps to 1 (the minimum).
    expect(body.weeks_processed).toBe(1);
  });
});
