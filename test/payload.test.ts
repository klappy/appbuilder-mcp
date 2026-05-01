import { describe, expect, it } from "vitest";
import { PayloadSchema, canonicalize, payloadHash } from "../src/payload.js";

const validV10Payload = {
  schema_version: "1.0" as const,
  name: "WEB Bible",
  package: "org.ebible.web",
  bible_source: {
    kind: "usfm_zip" as const,
    url: "https://example.com/eng-web_usfm.zip",
    sha256: "a".repeat(64),
  },
};

const validV11BurritoPayload = {
  schema_version: "1.1" as const,
  name: "WEB Burrito",
  package: "org.ebible.web_burrito",
  bible_source: {
    kind: "burrito_zip" as const,
    url: "https://example.com/eng-web_burrito.zip",
    sha256: "b".repeat(64),
  },
};

describe("PayloadSchema", () => {
  it("accepts a minimal v1.0 USFM payload", () => {
    const parsed = PayloadSchema.parse(validV10Payload);
    expect(parsed.schema_version).toBe("1.0");
    expect(parsed.bible_source.kind).toBe("usfm_zip");
    expect(parsed.icons).toEqual([]);
    expect(parsed.build_modern_pwa).toBe(false);
  });

  it("accepts a v1.1 burrito payload (strict-extension bump)", () => {
    const parsed = PayloadSchema.parse(validV11BurritoPayload);
    expect(parsed.schema_version).toBe("1.1");
    expect(parsed.bible_source.kind).toBe("burrito_zip");
  });

  it("rejects a payload whose package is not Java-style reverse-DNS", () => {
    const result = PayloadSchema.safeParse({
      ...validV10Payload,
      package: "NotReverseDNS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bible_source with a non-hex sha256", () => {
    const result = PayloadSchema.safeParse({
      ...validV10Payload,
      bible_source: {
        ...validV10Payload.bible_source,
        sha256: "not-a-real-hash",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown bible_source.kind", () => {
    const result = PayloadSchema.safeParse({
      ...validV10Payload,
      bible_source: {
        kind: "pdf_zip",
        url: "https://example.com/x.zip",
        sha256: "c".repeat(64),
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("canonicalize (RFC 8785 JCS)", () => {
  it("sorts object keys lexicographically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("emits no insignificant whitespace", () => {
    expect(canonicalize({ a: [1, 2, 3] })).toBe('{"a":[1,2,3]}');
  });

  it("produces identical output for two logically-equivalent payloads", () => {
    const a = { schema_version: "1.0", name: "X", package: "org.x.app" };
    const b = { name: "X", package: "org.x.app", schema_version: "1.0" };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("drops undefined-valued keys", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("escapes string contents per JSON spec", () => {
    expect(canonicalize('a"b')).toBe('"a\\"b"');
  });
});

describe("payloadHash", () => {
  it("returns a 64-character lowercase hex digest", async () => {
    const hash = await payloadHash(PayloadSchema.parse(validV10Payload));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for two key-reordered but logically-equivalent payloads", async () => {
    const reordered = {
      bible_source: validV10Payload.bible_source,
      package: validV10Payload.package,
      name: validV10Payload.name,
      schema_version: validV10Payload.schema_version,
    };
    const a = await payloadHash(PayloadSchema.parse(validV10Payload));
    const b = await payloadHash(PayloadSchema.parse(reordered));
    expect(a).toBe(b);
  });

  it("differs when any input field changes", async () => {
    const a = await payloadHash(PayloadSchema.parse(validV10Payload));
    const b = await payloadHash(
      PayloadSchema.parse({ ...validV10Payload, name: "Different" }),
    );
    expect(a).not.toBe(b);
  });
});
