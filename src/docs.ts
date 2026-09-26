/**
 * docs.ts — in-process retrieval over the bundled appbuilder-mcp canon.
 *
 * The canon/ tree is bundled at build time (scripts/bundle-canon.ts ->
 * src/canon-bundle.generated.ts) and searched here with a small BM25 scorer.
 * No runtime call to oddkit or any other upstream: the docs tool works
 * offline and its answers are pinned to the deployed commit.
 *
 * History: this file was previously a thin proxy to oddkit's MCP endpoint
 * (session-13 Shape A). Migrated off runtime oddkit chaining per the kitchen
 * oddkit-legacy-caller-audit, borrowing ptxprint-mcp's bundled
 * progressive-disclosure docs pattern. Response shape is unchanged.
 */

import { CANON_BUNDLE, type BundledDoc } from "./canon-bundle.generated";

// ---------- Public types ----------

export type DocsAudience = "headless" | "gui";
export type DocsDepth = 1 | 2 | 3;

export interface DocsSource {
  uri: string;
  title: string;
  snippet: string;
  score?: number;
}

export interface DocsResult {
  answer: string | null;
  sources: DocsSource[];
  deeper: string[];
  governance_source: "bundled";
  error?: string;
}

// ---------- search hit shape (internal) ----------

interface OddkitSearchHit {
  uri: string;
  path: string;
  title: string;
  tags?: string[];
  score: number;
  snippet: string;
  source: string;
}

// ---------- The tool entry point ----------

export async function fetchDocs(
  query: string,
  audience: DocsAudience = "headless",
  depth: DocsDepth = 1,
  corpus: BundledDoc[] = CANON_BUNDLE,
): Promise<DocsResult> {
  const hits = searchBundle(query, corpus);
  if (hits.length === 0) {
    return { answer: null, sources: [], deeper: suggestDeeperQueries(query), governance_source: "bundled" };
  }
  const ranked = audienceRank(hits, audience);
  const top = ranked[0];
  const full = (uri: string) => corpus.find((d) => d.uri === uri)?.content;

  if (depth === 1) {
    return {
      answer: top.snippet,
      sources: ranked.slice(0, 5).map(toSource),
      deeper: suggestDeeperFromHits(ranked),
      governance_source: "bundled",
    };
  }
  const sources: DocsSource[] = ranked.slice(0, 5).map(toSource);
  sources[0].snippet = full(top.uri) ?? top.snippet;
  if (depth === 3) {
    for (let i = 1; i < 3 && i < sources.length; i++) {
      sources[i].snippet = full(sources[i].uri) ?? sources[i].snippet;
    }
  }
  return {
    answer: sources[0].snippet,
    sources,
    deeper: suggestDeeperFromHits(ranked),
    governance_source: "bundled",
  };
}

// ---------- Internals ----------

const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "is", "it", "for", "on", "how", "do", "i", "what", "with", "by", "be", "can", "this", "that", "my"]);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** BM25 over title (weighted x3) + tags (x2) + body. */
export function searchBundle(query: string, corpus: BundledDoc[] = CANON_BUNDLE): OddkitSearchHit[] {
  const qTerms = [...new Set(tokenize(query))];
  if (qTerms.length === 0) return [];
  const docTokens = corpus.map((d) => [
    ...tokenize(d.title), ...tokenize(d.title), ...tokenize(d.title),
    ...tokenize(d.tags.join(" ")), ...tokenize(d.tags.join(" ")),
    ...tokenize(d.content),
  ]);
  const N = corpus.length;
  const avgdl = docTokens.reduce((a, t) => a + t.length, 0) / Math.max(N, 1);
  const df = new Map<string, number>();
  for (const q of qTerms) df.set(q, docTokens.filter((t) => t.includes(q)).length);
  const k1 = 1.2, b = 0.75;
  const hits: OddkitSearchHit[] = [];
  corpus.forEach((d, i) => {
    const toks = docTokens[i];
    let score = 0;
    for (const q of qTerms) {
      const tf = toks.reduce((a, t) => a + (t === q ? 1 : 0), 0);
      if (!tf) continue;
      const n = df.get(q) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * toks.length) / avgdl)));
    }
    if (score > 0) {
      hits.push({ uri: d.uri, path: d.path, title: d.title, tags: d.tags, score: Math.round(score * 1000) / 1000, snippet: snippetFor(d.content, qTerms), source: "bundled" });
    }
  });
  hits.sort((a, b2) => b2.score - a.score);
  return hits.slice(0, 10);
}

function snippetFor(content: string, terms: string[]): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const paras = body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let best = paras[0] ?? "";
  let bestScore = -1;
  for (const p of paras) {
    const lp = p.toLowerCase();
    const s = terms.reduce((a, t) => a + (lp.includes(t) ? 1 : 0), 0);
    if (s > bestScore) { best = p; bestScore = s; }
  }
  return best.trim().slice(0, 600);
}

/**
 * Re-rank hits by audience preference. Bias is additive: docs whose tags
 * intersect the audience's preferred-tag set get a bonus that floats them
 * above same-score peers, but does not displace clearly-better matches.
 */
function audienceRank(
  hits: OddkitSearchHit[],
  audience: DocsAudience,
): OddkitSearchHit[] {
  const preferredTags =
    audience === "headless"
      ? new Set(["headless", "agent-kb", "mcp", "v1.2-aligned"])
      : new Set(["gui", "training", "manual", "derivative"]);

  const scored = hits.map((h) => {
    const matches = (h.tags ?? []).filter((t) => preferredTags.has(t)).length;
    // Bonus: small fractional boost per matching tag, scaled so two matches
    // can outrank a one-point score gap but not a five-point one.
    const adjustedScore = h.score + matches * 0.5;
    return { hit: h, adjustedScore };
  });

  scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return scored.map((s) => s.hit);
}

function toSource(hit: OddkitSearchHit): DocsSource {
  return {
    uri: hit.uri,
    title: hit.title,
    snippet: hit.snippet,
    score: hit.score,
  };
}

function suggestDeeperFromHits(hits: OddkitSearchHit[]): string[] {
  // Cheap "want to go deeper?" generator: the next 2-3 distinct doc titles
  // become candidate follow-up questions phrased generically.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hits.slice(0, 5)) {
    if (seen.has(h.title)) continue;
    seen.add(h.title);
    out.push(`Tell me more about: ${h.title}`);
    if (out.length >= 3) break;
  }
  return out;
}

function suggestDeeperQueries(query: string): string[] {
  // No-hit fallback: nudge the agent toward broader retries.
  return [
    `${query} (broader)`,
    `What canon articles are available about this topic?`,
  ];
}
