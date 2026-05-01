import { describe, expect, it } from "vitest";
import {
  BLOB_SCHEMA,
  DOUBLE_SCHEMA,
  BLOB_INDEX,
  DOUBLE_INDEX,
  b,
  d,
  buildBlobsArray,
  buildDoublesArray,
  exportSchema,
} from "../src/telemetry-schema.js";

// ────────────────────────────────────────────────────────────
//  Position-pinning — the schema is forever.
//  Reordering or deleting any entry below breaks already-written
//  Analytics Engine data. The hand-pinned constants below must match
//  BLOB_SCHEMA / DOUBLE_SCHEMA exactly. If you change the schema, you
//  must update both the schema module AND this pin in lockstep — and
//  you must understand that historical AE rows now have a different
//  meaning at the changed position. Don't.
// ────────────────────────────────────────────────────────────

const PINNED_BLOB_NAMES = [
  "event_type",
  "method",
  "tool_name",
  "consumer_label",
  "consumer_source",
  "worker_version",
  "phase",
  "failure_mode",
  "cache_outcome",
  "payload_hash_prefix",
  "docs_audience",
  "docs_top_uri",
] as const;

const PINNED_DOUBLE_NAMES = [
  "count",
  "duration_ms",
  "bytes_in",
  "bytes_out",
  "sources_count",
  "fonts_count",
  "figures_count",
  "passes_completed",
  "overfull_count",
  "pages_count",
] as const;

describe("BLOB_SCHEMA — position is forever", () => {
  it("has 12 blobs in the canonical order", () => {
    expect(BLOB_SCHEMA.map((f) => f.name)).toEqual(PINNED_BLOB_NAMES);
  });

  it("BLOB_INDEX is 1-indexed and matches the schema order", () => {
    PINNED_BLOB_NAMES.forEach((name, i) => {
      expect(BLOB_INDEX[name]).toBe(i + 1);
    });
  });

  it("every entry has a non-empty desc", () => {
    for (const f of BLOB_SCHEMA) {
      expect(f.desc.length).toBeGreaterThan(0);
    }
  });
});

describe("DOUBLE_SCHEMA — position is forever", () => {
  it("has 10 doubles in the canonical order", () => {
    expect(DOUBLE_SCHEMA.map((f) => f.name)).toEqual(PINNED_DOUBLE_NAMES);
  });

  it("DOUBLE_INDEX is 1-indexed and matches the schema order", () => {
    PINNED_DOUBLE_NAMES.forEach((name, i) => {
      expect(DOUBLE_INDEX[name]).toBe(i + 1);
    });
  });
});

describe("b() / d() helpers", () => {
  it("b('event_type') === 'blob1'", () => {
    expect(b("event_type")).toBe("blob1");
  });

  it("b('tool_name') === 'blob3'", () => {
    expect(b("tool_name")).toBe("blob3");
  });

  it("b('docs_top_uri') === 'blob12'", () => {
    expect(b("docs_top_uri")).toBe("blob12");
  });

  it("d('count') === 'double1'", () => {
    expect(d("count")).toBe("double1");
  });

  it("d('duration_ms') === 'double2'", () => {
    expect(d("duration_ms")).toBe("double2");
  });

  it("d('pages_count') === 'double10'", () => {
    expect(d("pages_count")).toBe("double10");
  });
});

describe("buildBlobsArray", () => {
  it("returns 12 elements in BLOB_SCHEMA order", () => {
    const arr = buildBlobsArray({});
    expect(arr).toHaveLength(12);
    expect(arr.every((v) => v === "")).toBe(true);
  });

  it("places named values at their declared positions", () => {
    const arr = buildBlobsArray({
      event_type: "tool_call",
      tool_name: "submit_build",
      docs_top_uri: "klappy://canon/x",
    });
    expect(arr[0]).toBe("tool_call"); // event_type → blob1
    expect(arr[1]).toBe(""); // method → blob2 (unset)
    expect(arr[2]).toBe("submit_build"); // tool_name → blob3
    expect(arr[11]).toBe("klappy://canon/x"); // docs_top_uri → blob12
  });

  it("transposing keys does not transpose positions", () => {
    const a = buildBlobsArray({
      tool_name: "submit_build",
      event_type: "tool_call",
    });
    const b = buildBlobsArray({
      event_type: "tool_call",
      tool_name: "submit_build",
    });
    expect(a).toEqual(b);
  });
});

describe("buildDoublesArray", () => {
  it("returns 10 elements in DOUBLE_SCHEMA order", () => {
    const arr = buildDoublesArray({});
    expect(arr).toHaveLength(10);
    expect(arr.every((v) => v === 0)).toBe(true);
  });

  it("places named values at their declared positions", () => {
    const arr = buildDoublesArray({
      count: 1,
      duration_ms: 250,
      bytes_out: 4096,
    });
    expect(arr[0]).toBe(1); // count → double1
    expect(arr[1]).toBe(250); // duration_ms → double2
    expect(arr[3]).toBe(4096); // bytes_out → double4
    expect(arr[2]).toBe(0); // bytes_in → double3 (unset)
  });
});

describe("exportSchema()", () => {
  const schema = exportSchema();

  it("declares the appbuilder_telemetry dataset", () => {
    expect(schema.dataset).toBe("appbuilder_telemetry");
  });

  it("includes all 12 blobs with position+column+name+desc", () => {
    expect(schema.blobs).toHaveLength(12);
    schema.blobs.forEach((entry, i) => {
      expect(entry.position).toBe(i + 1);
      expect(entry.column).toBe(`blob${i + 1}`);
      expect(entry.name).toBe(PINNED_BLOB_NAMES[i]);
      expect(entry.desc.length).toBeGreaterThan(0);
    });
  });

  it("includes all 10 doubles with position+column+name+desc", () => {
    expect(schema.doubles).toHaveLength(10);
    schema.doubles.forEach((entry, i) => {
      expect(entry.position).toBe(i + 1);
      expect(entry.column).toBe(`double${i + 1}`);
      expect(entry.name).toBe(PINNED_DOUBLE_NAMES[i]);
      expect(entry.desc.length).toBeGreaterThan(0);
    });
  });

  it("includes a non-empty notes array", () => {
    expect(Array.isArray(schema.notes)).toBe(true);
    expect(schema.notes.length).toBeGreaterThan(0);
  });
});
