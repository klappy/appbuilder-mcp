import { describe, expect, it } from "vitest";
import { rewriteSemanticSql } from "../src/telemetry-schema.js";

// Spec acceptance (docs/parity-spec.md §3 P1.4):
//   - bare-name SELECT  → `colN AS name`
//   - bare-name WHERE   → `colN`
//   - string literals untouched
//   - positional refs idempotent (blob1 stays blob1)
//   - user AS aliases preserved

describe("rewriteSemanticSql — SELECT clause aliasing", () => {
  it("rewrites a bare SELECT name to `colN AS name`", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry",
    );
    expect(out).toContain("blob3 AS tool_name");
  });

  it("preserves a user AS alias on a SELECT name", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name AS t FROM appbuilder_telemetry",
    );
    // user alias `t` survives; the schema-name aliasing is suppressed.
    expect(out).toContain("blob3 AS t");
    expect(out).not.toContain("blob3 AS tool_name");
  });

  it("rewrites multiple SELECT columns independently", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name, consumer_label FROM appbuilder_telemetry",
    );
    expect(out).toContain("blob3 AS tool_name");
    expect(out).toContain("blob4 AS consumer_label");
  });

  it("does not alias inside complex SELECT expressions like AVG(duration_ms)", () => {
    const out = rewriteSemanticSql(
      "SELECT AVG(duration_ms) AS avg_dur FROM appbuilder_telemetry",
    );
    // double2 substituted inside the AVG; user `AS avg_dur` preserved;
    // no `double2 AS duration_ms` artifact.
    expect(out).toContain("AVG(double2)");
    expect(out).toContain("AS avg_dur");
    expect(out).not.toContain("double2 AS duration_ms");
  });
});

describe("rewriteSemanticSql — WHERE / GROUP BY clauses", () => {
  it("rewrites bare names in WHERE to positional refs (no aliasing)", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry WHERE event_type = 'tool_call'",
    );
    expect(out).toContain("WHERE blob1 = 'tool_call'");
  });

  it("rewrites bare names in GROUP BY to positional refs (no aliasing)", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry GROUP BY tool_name",
    );
    expect(out).toContain("GROUP BY blob3");
  });

  it("rewrites bare names in ORDER BY to positional refs", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry ORDER BY duration_ms",
    );
    expect(out).toContain("ORDER BY double2");
  });
});

describe("rewriteSemanticSql — string literal protection", () => {
  it("does not substitute schema names inside string literals", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry WHERE consumer_label = 'tool_name'",
    );
    // The 'tool_name' literal stays the literal; the consumer_label column ref
    // becomes blob4. The bare tool_name in SELECT becomes blob3 AS tool_name.
    expect(out).toContain("'tool_name'");
    expect(out).toContain("blob4 = 'tool_name'");
    expect(out).toContain("blob3 AS tool_name");
  });

  it("preserves embedded quotes in string literals (SQL '' escape)", () => {
    const out = rewriteSemanticSql(
      "SELECT tool_name FROM appbuilder_telemetry WHERE consumer_label = 'a''b'",
    );
    expect(out).toContain("'a''b'");
  });
});

describe("rewriteSemanticSql — positional idempotency", () => {
  it("a query already using blob1 is unchanged", () => {
    const sql =
      "SELECT blob3 AS tool_name FROM appbuilder_telemetry WHERE blob1 = 'tool_call'";
    expect(rewriteSemanticSql(sql)).toBe(sql);
  });

  it("a query using double2 directly is unchanged", () => {
    const sql =
      "SELECT AVG(double2) AS avg_dur FROM appbuilder_telemetry WHERE blob1 = 'tool_call'";
    expect(rewriteSemanticSql(sql)).toBe(sql);
  });

  it("running the rewriter twice is idempotent", () => {
    const sql =
      "SELECT tool_name FROM appbuilder_telemetry WHERE event_type = 'tool_call'";
    const once = rewriteSemanticSql(sql);
    const twice = rewriteSemanticSql(once);
    expect(twice).toBe(once);
  });
});

describe("rewriteSemanticSql — schema-foreign identifiers", () => {
  it("leaves unrelated identifiers (timestamp, _sample_interval) alone", () => {
    const out = rewriteSemanticSql(
      "SELECT SUM(_sample_interval) AS calls FROM appbuilder_telemetry WHERE timestamp > NOW() - INTERVAL '30' DAY",
    );
    expect(out).toContain("_sample_interval");
    expect(out).toContain("timestamp");
  });
});
