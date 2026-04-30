/**
 * Payload schema, JCS canonicalization, and sha256 hashing for appbuilder-mcp.
 *
 * The payload is the function-input to Scripture App Builder treated as a
 * pure function:
 *
 *   SAB(name, package, bible_source, [keystore], [about], [icons], [pwa]) -> APK
 *
 * Hash computation follows RFC 8785 (JSON Canonicalization Scheme): sort keys
 * lexicographically, no whitespace, smallest valid JSON form for each
 * primitive. Two logically-equivalent payloads (different key order or
 * whitespace) canonicalize to identical strings and therefore produce
 * identical hashes, yielding identical R2 paths and free cache hits.
 *
 * Provenance: structural pattern derived from
 * klappy://canon/articles/payload-construction (ptxprint-mcp). The JCS
 * canonicalize() and sha256Hex() are copied verbatim — they are
 * payload-shape-agnostic. The schema itself is fresh for the AppBuilder
 * surface (see canon/articles/payload-construction.md).
 */

import { z } from "zod";

// ---------- Schema ----------

/**
 * Bible content the SAB CLI consumes via -b.
 *
 * v0.1 supports kind ∈ {"usfm_zip", "usx_zip"}. The burrito-capable upstream
 * tag will add kind="burrito_zip"; that is a Container-only schema bump,
 * tracked at canon/handoffs/burrito-tag-handoff.md.
 */
const BibleSourceSchema = z.object({
  kind: z.enum(["usfm_zip", "usx_zip"]),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const IconSchema = z.object({
  filename: z.string().min(1).max(255),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const KeystoreSchema = z.object({
  keystore_url: z.string().url(),
  keystore_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  info_url: z.string().url(),
  info_sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const PayloadSchema = z.object({
  schema_version: z.literal("1.0"),

  // App identity
  name: z.string().min(1).max(64),
  // Java-style reverse-DNS package name (e.g. org.ebible.web)
  package: z
    .string()
    .min(3)
    .max(155)
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
      message: "package must be a Java-style reverse-DNS identifier (e.g. org.example.app)",
    }),

  // Bible content
  bible_source: BibleSourceSchema,

  // Branding (all optional; SAB falls back to defaults when absent)
  about_url: z.string().url().optional(),
  about_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  icons: z.array(IconSchema).default([]),

  // Signing (optional; container falls back to bundled debug keystore)
  keystore: KeystoreSchema.optional(),

  // Build options
  build_modern_pwa: z.boolean().default(false),
});

export type Payload = z.infer<typeof PayloadSchema>;

// ---------- JCS canonicalization (RFC 8785) ----------

/**
 * Canonicalize a JSON-serializable value per RFC 8785.
 *
 * Rules:
 *   - Object members serialized in lexicographic order of keys (UTF-16 code
 *     unit comparison).
 *   - No insignificant whitespace.
 *   - Strings escaped per JSON spec.
 *
 * Provenance: copied verbatim from ptxprint-mcp/src/payload.ts. The function
 * is payload-shape-agnostic.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalize: non-finite number");
    }
    if (Number.isInteger(value)) return value.toString();
    return value.toString();
  }
  if (typeof value === "string") return jsonStringEscape(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) continue;
      parts.push(jsonStringEscape(k) + ":" + canonicalize(v));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}

function jsonStringEscape(s: string): string {
  return JSON.stringify(s);
}

// ---------- Hashing ----------

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function payloadHash(payload: Payload): Promise<string> {
  return sha256Hex(canonicalize(payload));
}
