import { describe, expect, it } from "vitest";
import { handleDiagnosticsSchema } from "../src/diagnostics-schema-route.js";
import { exportSchema } from "../src/telemetry-schema.js";

// Spec acceptance (docs/parity-spec.md §3 P1.5):
//   - GET /diagnostics/schema returns HTTP 200
//   - Content-Type: application/json
//   - body equals exportSchema()
//
// The route handler is extracted from the worker fetch dispatcher so we can
// exercise it directly without pulling in cloudflare:* / agents/mcp imports.
// The dispatcher in src/index.ts delegates to handleDiagnosticsSchema and
// returns its response when non-null. A wrangler-dev curl transcript at the
// validator stage exercises the same code path through the worker entry.

describe("handleDiagnosticsSchema (GET /diagnostics/schema)", () => {
  it("returns HTTP 200 on GET", async () => {
    const res = handleDiagnosticsSchema(
      new Request("https://appbuilder-mcp.example.com/diagnostics/schema", {
        method: "GET",
      }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
  });

  it("returns Content-Type: application/json", () => {
    const res = handleDiagnosticsSchema(
      new Request("https://appbuilder-mcp.example.com/diagnostics/schema"),
    );
    expect(res).not.toBeNull();
    expect(res!.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("body equals exportSchema()", async () => {
    const res = handleDiagnosticsSchema(
      new Request("https://appbuilder-mcp.example.com/diagnostics/schema"),
    );
    expect(res).not.toBeNull();
    const body = await res!.json();
    expect(body).toEqual(exportSchema());
  });

  it("body declares appbuilder_telemetry, 12 blobs, and 10 doubles", async () => {
    const res = handleDiagnosticsSchema(
      new Request("https://appbuilder-mcp.example.com/diagnostics/schema"),
    );
    const body = (await res!.json()) as ReturnType<typeof exportSchema>;
    expect(body.dataset).toBe("appbuilder_telemetry");
    expect(body.blobs).toHaveLength(12);
    expect(body.doubles).toHaveLength(10);
  });

  it("returns null on non-GET methods (so the dispatcher falls through)", () => {
    expect(
      handleDiagnosticsSchema(
        new Request("https://appbuilder-mcp.example.com/diagnostics/schema", {
          method: "POST",
        }),
      ),
    ).toBeNull();
  });

  it("returns null on a different path (so the dispatcher falls through)", () => {
    expect(
      handleDiagnosticsSchema(
        new Request("https://appbuilder-mcp.example.com/health"),
      ),
    ).toBeNull();
  });
});
