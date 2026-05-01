/**
 * GET /diagnostics/schema route handler.
 *
 * Companion to the `telemetry_schema` MCP tool. Returns the same
 * `exportSchema()` body as a JSON response so external query authors who
 * can't (or won't) call MCP tools can still discover the blob/double
 * position-to-name mapping over plain HTTP.
 *
 * Lives in its own module (not inline in `src/index.ts`) so the route can
 * be unit-tested without pulling in the cloudflare:* / agents/mcp imports
 * that the worker entry point requires. The fetch handler in `src/index.ts`
 * delegates to `handleDiagnosticsSchema` and returns its response when
 * non-null.
 *
 * Authority: klappy://canon/specs/appbuilder-mcp-v1-spec §3 (parity row P1.5).
 */

import { exportSchema } from "./telemetry-schema.js";

/**
 * Try to handle a request as `GET /diagnostics/schema`. Returns the JSON
 * response on a match; returns `null` when the request does not match the
 * route (the caller continues route dispatch).
 */
export function handleDiagnosticsSchema(req: Request): Response | null {
  if (req.method !== "GET") return null;
  const url = new URL(req.url);
  if (url.pathname !== "/diagnostics/schema") return null;
  return Response.json(exportSchema());
}
