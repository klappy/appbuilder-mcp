import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchDocs, searchBundle } from "../src/docs";
import { CANON_BUNDLE } from "../src/canon-bundle.generated";

describe("docs (bundled canon, no runtime oddkit)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("bundles the canon tree", () => {
    expect(CANON_BUNDLE.length).toBeGreaterThan(10);
    expect(CANON_BUNDLE.some((d) => d.uri === "klappy://canon/articles/agent-quickstart")).toBe(true);
  });

  it("answers without any network access", async () => {
    vi.stubGlobal("fetch", () => { throw new Error("network forbidden"); });
    const r = await fetchDocs("keystore reuse", "headless", 2);
    expect(r.governance_source).toBe("bundled");
    expect(r.error).toBeUndefined();
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.answer && r.answer.length).toBeGreaterThan(100);
  });

  it("ranks the matching article first", () => {
    expect(searchBundle("failure mode taxonomy")[0].uri).toBe("klappy://canon/articles/failure-mode-taxonomy");
  });

  it("returns empty + deeper hints for no hits", async () => {
    const r = await fetchDocs("zzqxv", "headless", 1);
    expect(r.answer).toBeNull();
    expect(r.deeper.length).toBeGreaterThan(0);
  });
});
