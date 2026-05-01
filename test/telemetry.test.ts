import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROHIBITED_FIELDS,
  rateLimitExceeded,
  redactAndValidate,
  resetRateLimiter,
  resolveTelemetryPolicy,
  validateDatasetAllowlist,
  forwardTelemetryQuery,
  MINIMAL_POLICY,
  type TelemetryEnv,
} from "../src/telemetry.js";

// Each describe block pins one named DoD item from
// canon/specs/appbuilder-mcp-v1-spec.md §6 (which mirrors ptxprint-mcp v1.3
// §6 verbatim). The operational items —
//   - privacy floor
//   - three-tier governance fallback (knowledge_base → bundled → minimal)
//   - per-consumer rate limit
//   - dataset allowlist
// — are the four DoD items the parity-matrix §3 row "Telemetry unit tests"
// names. Every test below quotes the DoD line in a comment and asserts the
// observable behavior.

// ────────────────────────────────────────────────────────────
//  DoD: Privacy floor
//
//  v1 spec §6 (mirrors ptxprint-mcp v1.3 §6):
//  "Privacy floor for AppBuilder is identical to PTXprint in spirit:
//  app identity (name, package) is treated as content and never logged;
//  structural counts are public."
//
//  Operational form: the 10 PROHIBITED_FIELDS are rejected before
//  writeDataPoint is ever called, and any extra key on the envelope
//  rejects via the strict zod schema.
// ────────────────────────────────────────────────────────────

describe("redactAndValidate (privacy floor)", () => {
  const goodEnvelope = {
    event_type: "job_terminal" as const,
    job_id: "abc123",
    failure_mode: "success",
    duration_ms: 1234,
    bytes_out: 4096,
  };

  it("accepts a clean envelope", () => {
    const result = redactAndValidate(goodEnvelope);
    expect(result.ok).toBe(true);
  });

  it("rejects every one of the 10 prohibited fields with a clear error", () => {
    for (const field of PROHIBITED_FIELDS) {
      const result = redactAndValidate({ ...goodEnvelope, [field]: "x" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain(`prohibited field: ${field}`);
      }
    }
  });

  it("rejects unknown keys via the strict schema (no silent passthrough)", () => {
    const result = redactAndValidate({
      ...goodEnvelope,
      not_in_schema: "smuggled",
    });
    expect(result.ok).toBe(false);
  });

  it("truncates payload_hash_prefix to 8 hex chars (defense in depth)", () => {
    const result = redactAndValidate({
      event_type: "job_phase" as const,
      payload_hash_prefix: "deadbeefcafebabe1234567890abcdef",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.payload_hash_prefix).toBe("deadbeef");
      expect(result.envelope.payload_hash_prefix?.length).toBe(8);
    }
  });

  it("rejects an envelope whose event_type is not job_phase or job_terminal", () => {
    const result = redactAndValidate({ event_type: "tool_call" });
    expect(result.ok).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
//  DoD: Three-tier governance fallback
//
//  v1 spec §6 (mirrors ptxprint-mcp v1.3 §6):
//  "knowledge_base → bundled → minimal" — three tiers, deterministic
//  fallback. The minimal tier is hard-coded so the worker can serve a
//  policy even when GitHub raw and the bundled blob are both
//  unavailable.
// ────────────────────────────────────────────────────────────

describe("resolveTelemetryPolicy (three-tier fallback)", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns minimal tier when knowledge_base fetch fails and no bundled provided", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const { policy, source } = await resolveTelemetryPolicy(undefined);
    expect(source).toBe("minimal");
    expect(policy).toBe(MINIMAL_POLICY);
  });

  it("returns bundled tier when knowledge_base fetch fails but bundled is provided", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const bundled = "# Telemetry Governance — bundled stub";
    const { policy, source } = await resolveTelemetryPolicy(bundled);
    expect(source).toBe("bundled");
    expect(policy).toBe(bundled);
  });

  it("returns knowledge_base tier when fetch succeeds and the response passes the sanity check", async () => {
    const liveBody =
      "# Telemetry Governance\n\nlive content from raw.githubusercontent.com";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(liveBody, { status: 200 }),
    ) as unknown as typeof fetch;
    const { policy, source } = await resolveTelemetryPolicy("ignored-bundled");
    expect(source).toBe("knowledge_base");
    expect(policy).toBe(liveBody);
  });

  it("falls past knowledge_base when the sanity-check header is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("404 not found", { status: 200 }),
    ) as unknown as typeof fetch;
    const { source } = await resolveTelemetryPolicy(undefined);
    // Sanity-check string '# Telemetry Governance' missing → fall through.
    expect(source).toBe("minimal");
  });
});

// ────────────────────────────────────────────────────────────
//  DoD: Per-consumer rate limit
//
//  v1 spec §6 (mirrors ptxprint-mcp v1.3 §6):
//  "telemetry_public is rate-limited per consumer label, default 60/hr."
//  In-memory sliding window — the first call past `limitPerHour` returns
//  true (limit exceeded). Other consumer labels are independent.
// ────────────────────────────────────────────────────────────

describe("rateLimitExceeded (per-consumer rate limit)", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("returns false for the first call from a consumer", () => {
    expect(rateLimitExceeded("alice", 5)).toBe(false);
  });

  it("returns true after the limit is exceeded", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimitExceeded("alice", 5)).toBe(false);
    }
    // 6th call exceeds the limit of 5
    expect(rateLimitExceeded("alice", 5)).toBe(true);
  });

  it("rate-limits each consumer independently", () => {
    for (let i = 0; i < 5; i++) {
      rateLimitExceeded("alice", 5);
    }
    expect(rateLimitExceeded("alice", 5)).toBe(true);
    // bob's window is fresh
    expect(rateLimitExceeded("bob", 5)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
//  DoD: Dataset allowlist
//
//  v1 spec §6 (mirrors ptxprint-mcp v1.3 §6):
//  "telemetry_public must reject queries that target any dataset other
//  than appbuilder_telemetry, even via comments or string literals."
// ────────────────────────────────────────────────────────────

describe("validateDatasetAllowlist (dataset allowlist)", () => {
  it("accepts a query targeting only appbuilder_telemetry", () => {
    expect(
      validateDatasetAllowlist("SELECT * FROM appbuilder_telemetry"),
    ).toBe(true);
  });

  it("accepts case-insensitive table references", () => {
    expect(
      validateDatasetAllowlist("select * From APPBUILDER_TELEMETRY"),
    ).toBe(true);
  });

  it("rejects a query targeting a different dataset", () => {
    expect(
      validateDatasetAllowlist("SELECT * FROM other_dataset"),
    ).toBe(false);
  });

  it("rejects a query that joins another dataset", () => {
    expect(
      validateDatasetAllowlist(
        "SELECT * FROM appbuilder_telemetry JOIN secret_table ON ...",
      ),
    ).toBe(false);
  });

  it("rejects a query with no FROM clause", () => {
    expect(validateDatasetAllowlist("SELECT 1")).toBe(false);
  });

  it("does not let comments smuggle in another dataset reference", () => {
    // Block-comment FROM is stripped before the FROM regex runs; the
    // remaining query has no FROM at all → reject.
    expect(
      validateDatasetAllowlist("/* FROM secret_table */ SELECT 1"),
    ).toBe(false);
  });

  it("does not let string literals fool the FROM detector", () => {
    // The string literal 'FROM secret_table' is replaced with '' before
    // the regex runs; the actual FROM target is appbuilder_telemetry.
    expect(
      validateDatasetAllowlist(
        "SELECT 'FROM secret_table' AS x FROM appbuilder_telemetry",
      ),
    ).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
//  Integration: forwardTelemetryQuery composes the three guards
//
//  Verifies the rejection paths return sanitized error envelopes (Guard 3)
//  rather than leaking AE error text. Live AE forwarding is exercised by
//  the validator session against a deployed worker.
// ────────────────────────────────────────────────────────────

describe("forwardTelemetryQuery (guard composition)", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    resetRateLimiter();
    originalFetch = globalThis.fetch;
    // Stub fetch so any guard-passing call cannot reach the real
    // api.cloudflare.com endpoint. Tests in this block only assert
    // sanitized rejection paths; they never depend on the response body.
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const env: TelemetryEnv = {
    CF_ACCOUNT_ID: "acct-id",
    CF_API_TOKEN: "token",
    TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR: "60",
  };

  it("rejects with a sanitized error when the SQL targets a foreign dataset", async () => {
    const result = await forwardTelemetryQuery(
      env,
      "SELECT * FROM secret_table",
      "alice",
    );
    expect(result.error).toContain("appbuilder_telemetry");
    expect(result.rows).toBeUndefined();
  });

  it("rejects with a sanitized error when the consumer is over rate limit", async () => {
    const tinyEnv: TelemetryEnv = { ...env, TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR: "1" };
    // First call: under the limit (rateLimitExceeded returns false on the 1st;
    // the 2nd call within the window exceeds).
    await forwardTelemetryQuery(
      tinyEnv,
      "SELECT * FROM appbuilder_telemetry",
      "bob",
    );
    // Second call: would exceed; we expect a rate-limit error rather than a
    // network attempt. (No fetch mock — if rate-limit didn't fire, this would
    // attempt a real fetch and likely time out or return a different error.)
    const result = await forwardTelemetryQuery(
      tinyEnv,
      "SELECT * FROM appbuilder_telemetry",
      "bob",
    );
    expect(result.error).toMatch(/rate limit/i);
  });
});
