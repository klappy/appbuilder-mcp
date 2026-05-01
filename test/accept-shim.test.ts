import { describe, expect, it } from "vitest";
import { shimMcpAccept, downgradeSSEToJson } from "../src/accept-shim.js";

const MCP_URL = "https://appbuilder-mcp.example.com/mcp";
const RPC_BODY = JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  id: 1,
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } },
});

function makeReq(accept: string | null, method = "POST"): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (accept !== null) headers.set("accept", accept);
  return new Request(MCP_URL, {
    method,
    headers,
    body: method === "POST" ? RPC_BODY : undefined,
    // @ts-expect-error duplex required by Workers runtime
    duplex: "half",
  });
}

describe("shimMcpAccept — Accept-header normalization", () => {
  it("passes through compliant dual-Accept clients unchanged", () => {
    const req = makeReq("application/json, text/event-stream");
    const result = shimMcpAccept(req);
    expect(result.req).toBe(req); // same object reference
    expect(result.downgradeToJson).toBe(false);
  });

  it("normalizes JSON-only clients and flags them for downgrade", () => {
    const req = makeReq("application/json");
    const result = shimMcpAccept(req);
    expect(result.req).not.toBe(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(true);
  });

  it("normalizes wildcard Accept without flagging downgrade (Python requests default)", () => {
    const req = makeReq("*/*");
    const result = shimMcpAccept(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(false);
  });

  it("normalizes missing Accept without flagging downgrade (Go net/http default)", () => {
    const req = makeReq(null);
    const result = shimMcpAccept(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(false);
  });

  it("normalizes empty-string Accept without flagging downgrade", () => {
    const req = makeReq("");
    const result = shimMcpAccept(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(false);
  });

  it("normalizes SSE-only clients without flagging downgrade", () => {
    const req = makeReq("text/event-stream");
    const result = shimMcpAccept(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(false);
  });

  it("preserves Accept casing variants — `Application/JSON`", () => {
    const req = makeReq("Application/JSON");
    const result = shimMcpAccept(req);
    expect(result.req.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(result.downgradeToJson).toBe(true);
  });

  it("does not mutate non-POST requests", () => {
    const req = makeReq("application/json", "GET");
    const result = shimMcpAccept(req);
    expect(result.req).toBe(req);
    expect(result.downgradeToJson).toBe(false);
  });

  it("preserves the request body through the rewrite", async () => {
    const req = makeReq("application/json");
    const result = shimMcpAccept(req);
    const body = await result.req.text();
    expect(body).toBe(RPC_BODY);
  });
});

describe("downgradeSSEToJson — SSE → plain JSON for legacy clients", () => {
  it("strips single-event SSE framing into plain JSON", async () => {
    const sseBody = `event: message
data: {"jsonrpc":"2.0","result":{"ok":true},"id":1}

`;
    const sseRes = new Response(sseBody, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
    const downgraded = await downgradeSSEToJson(sseRes);
    expect(downgraded.headers.get("content-type")).toBe("application/json");
    const text = await downgraded.text();
    expect(JSON.parse(text)).toEqual({
      jsonrpc: "2.0",
      result: { ok: true },
      id: 1,
    });
  });

  it("leaves multi-event SSE streams alone", async () => {
    const sseBody = `event: message
data: {"jsonrpc":"2.0","method":"progress","params":{"p":0.5}}

event: message
data: {"jsonrpc":"2.0","result":{"ok":true},"id":1}

`;
    const sseRes = new Response(sseBody, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
    const result = await downgradeSSEToJson(sseRes);
    expect(result.headers.get("content-type")).toContain("text/event-stream");
    const text = await result.text();
    expect(text).toBe(sseBody);
  });

  it("passes JSON responses through unchanged", async () => {
    const jsonRes = new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const result = await downgradeSSEToJson(jsonRes);
    expect(result).toBe(jsonRes);
  });

  it("preserves status code on downgrade", async () => {
    const sseBody = `event: message
data: {"jsonrpc":"2.0","error":{"code":-32601,"message":"method not found"},"id":1}

`;
    const sseRes = new Response(sseBody, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
    const downgraded = await downgradeSSEToJson(sseRes);
    expect(downgraded.status).toBe(200);
    const parsed = JSON.parse(await downgraded.text());
    expect(parsed.error.code).toBe(-32601);
  });
});
