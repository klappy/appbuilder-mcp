/**
 * Output naming derivation for appbuilder-mcp.
 *
 * Convention:
 *   <package>_<sanitized-name>_appbuilder.apk
 *   <package>_<sanitized-name>_appbuilder.log
 *
 * R2 layout:
 *   outputs/<payload_hash>/<package>_<sanitized-name>_appbuilder.apk
 *   outputs/<payload_hash>/<package>_<sanitized-name>_appbuilder.log
 *
 * Same content-addressed pattern as ptxprint-mcp — see
 * klappy://canon/articles/output-naming.
 */

import type { Payload } from "./payload.js";

/** Sanitize app name for use in a filename (alnum + dash/underscore only). */
export function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "app";
}

export function apkBasename(payload: Payload): string {
  return `${payload.package}_${sanitizeName(payload.name)}_appbuilder.apk`;
}

export function logBasename(payload: Payload): string {
  return `${payload.package}_${sanitizeName(payload.name)}_appbuilder.log`;
}

export function outputApkKey(payload: Payload, payloadHash: string): string {
  return `outputs/${payloadHash}/${apkBasename(payload)}`;
}

export function outputLogKey(payload: Payload, payloadHash: string): string {
  return `outputs/${payloadHash}/${logBasename(payload)}`;
}
