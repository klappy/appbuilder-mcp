/**
 * Permissive Accept-header shim for the MCP Streamable HTTP transport.
 *
 * The MCP Streamable HTTP spec requires `Accept: application/json,
 * text/event-stream` on POST /mcp. The @modelcontextprotocol/sdk
 * StreamableHTTPServerTransport enforces this strictly and 406s any
 * request missing either type — error string is hardcoded:
 *   "Not Acceptable: Client must accept both application/json and
 *    text/event-stream"
 *
 * In practice, many clients in the wild send something else:
 *   - Go net/http with no Accept set (defaults to none)
 *   - Python requests with default wildcard Accept (star-slash-star)
 *   - Naive JSON-RPC clients with `Accept: application/json` only
 *   - Older MCP-specific clients that haven't migrated to Streamable HTTP
 *
 * Strict spec enforcement is correct in principle but creates a real
 * onboarding cliff. This module relaxes the gate WITHOUT modifying the
 * SDK: we rewrite inbound Accept to the dual-type form before the SDK
 * validator sees it. If the client originally accepted only JSON (and
 * not wildcard), we record that and downgrade single-event SSE
 * responses to plain JSON for them.
 *
 * Compliant clients (already sending both types) pass through untouched.
 *
 * Tradeoff: this is intentionally lenient. Clients that genuinely don't
 * understand SSE framing benefit from the JSON downgrade. Clients that
 * sent the wildcard token get SSE-framed responses; if they can't parse
 * those, they should declare what they actually accept.
 *
 * Authority: MCP Streamable HTTP spec §"POST request handling".
 * SDK source: @modelcontextprotocol/sdk StreamableHTTPServerTransport.
 */

export interface AcceptShimResult {
  req: Request;
  /** True when the original client only accepted JSON (not wildcard);
   *  caller should downgrade single-event SSE responses to plain JSON. */
  downgradeToJson: boolean;
}

export function shimMcpAccept(req: Request): AcceptShimResult {
  if (req.method !== "POST") return { req, downgradeToJson: false };

  const accept = (req.headers.get("accept") || "").toLowerCase();
  const hasJson = accept.includes("application/json");
  const hasSSE = accept.includes("text/event-stream");
  const hasWildcard = accept.includes("*/*") || accept.trim() === "";

  // Already spec-compliant: pass through unchanged.
  if (hasJson && hasSSE) return { req, downgradeToJson: false };

  // Determine if client genuinely asked for JSON-only (not wildcard).
  // Wildcard clients accept anything, so SSE framing is fine for them.
  const downgradeToJson = hasJson && !hasSSE && !hasWildcard;

  // Rewrite Accept to the spec-compliant dual form so the SDK validator
  // proceeds. Body and method are preserved.
  const newHeaders = new Headers(req.headers);
  newHeaders.set("accept", "application/json, text/event-stream");

  const shimmed = new Request(req.url, {
    method: req.method,
    headers: newHeaders,
    body: req.body,
    // duplex is required by the Workers/undici runtime when constructing
    // a Request with a streaming body. Not yet in lib.dom RequestInit.
    // @ts-expect-error — duplex is not in the lib.dom RequestInit type yet.
    duplex: "half",
  });

  return { req: shimmed, downgradeToJson };
}

/**
 * Convert a single-event SSE response back to plain JSON for clients
 * that only sent `Accept: application/json`.
 *
 * SSE framing for a single JSON-RPC reply looks like:
 *   event: message
 *   data: {"jsonrpc":"2.0","result":...,"id":1}
 *   <blank line>
 *
 * If the response body has exactly one `data:` line, we strip the
 * framing and return plain JSON. Multi-event streams (progress
 * notifications, tool streaming, etc.) are returned as-is — a JSON-only
 * client can't consume those anyway, and silently truncating to the
 * first event would be worse than letting them see a parse error.
 */
export async function downgradeSSEToJson(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/event-stream")) return response;

  const text = await response.text();
  const dataLines = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  // Multi-event stream — leave it alone.
  if (dataLines.length !== 1) {
    const passthroughHeaders = new Headers(response.headers);
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: passthroughHeaders,
    });
  }

  const newHeaders = new Headers(response.headers);
  newHeaders.set("content-type", "application/json");
  newHeaders.delete("transfer-encoding");
  newHeaders.delete("content-length"); // body bytes change; let runtime recompute

  return new Response(dataLines[0], {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
