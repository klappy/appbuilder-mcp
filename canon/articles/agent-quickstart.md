---
uri: klappy://canon/articles/agent-quickstart
title: "Agent Quickstart — What This Server Is and How to Drive It"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "quickstart", "onboarding", "orientation", "getting-started", "discovery", "oddkit", "ptxprint-mcp"]
derives_from: "AGENTS.md, README.md, smoke/README.md, klappy://canon/articles/payload-construction, klappy://canon/articles/cli-reference"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/payload-construction.md, canon/articles/workflow-recipes.md"
canonical_status: non_canonical
date: 2026-05-01
status: draft
---

# Agent Quickstart — What This Server Is and How to Drive It

> The first article a new agent should land on when it connects to the
> deployed `appbuilder-mcp` server. The repo's `README.md` and `AGENTS.md`
> cover the same ground for agents that cloned the source — but an MCP-only
> agent has no filesystem access. Everything an MCP-only agent needs to
> orient itself lives here, retrievable through the `docs` tool.

---

## What appbuilder-mcp is

`appbuilder-mcp` wraps **Scripture App Builder (SAB)** — SIL's command-line
tool that turns USFM/USX/scripture-burrito Bible content into Android APKs
— behind a small MCP tool surface. The server is stateless and
content-addressed: an identical `submit_build` payload always returns the
same `job_id`, and a re-submit hits the cache rather than re-running the
Container.

The server lives at `https://appbuilder-mcp.klappy.workers.dev`. Source is
at [`klappy/appbuilder-mcp`](https://github.com/klappy/appbuilder-mcp). It
was modeled on the sister project
[`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp) (which
wraps PTXprint typesetting); most canon articles in this repo carry
`derives_from:` pointers into ptxprint-mcp's equivalent.

The architecture is a Cloudflare Worker that fronts a Cloudflare Container
running `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`
plus the SAB toolchain. Per-job state is held in Durable Objects; APK +
log outputs land in R2 at content-addressed paths. The agent never touches
any of that directly — it only sees the MCP tool surface.

---

## The discovery loop

The deploy itself is the source of truth — never trust a hand-maintained
list. Three endpoints answer the questions you have on first contact:

1. **`GET /health`** — returns `{ ok, service, version, spec, tools }`.
   The `tools` array is the live list as the running Worker reports it.
   READMEs drift; `/health` does not.
2. **`POST /mcp` `tools/list`** — full schema for every tool, including
   parameters, descriptions, and required fields. Run this once per
   session and treat the result as authoritative.
3. **`POST /mcp` `tools/call docs(query=...)`** — the canon-retrieval
   surface. Ask it operational questions in natural language. Depth 1
   returns the top doc; depth 2 returns the full document; depth 3
   returns multiple full documents.

The reasoning loop for a new build job is: **discover via `docs` →
construct payload → submit → poll → handle result.** No additional setup
is required. No API key. No keystore. The bundled debug keystore is the
Phase-0 floor; payload-supplied keystores override it for production.

---

## The tool surface (as of v0.1)

Authoritative list lives at `/health`. At time of writing the deploy
exposes:

| Tool | What it does |
|---|---|
| `submit_build` | Submit a build payload; returns `job_id` and predicted APK URL. Identical payloads return the same `job_id` (cache hit). |
| `get_job_status` | Poll one `job_id` for state, progress, errors, and (when complete) `apk_url` + `log_url`. |
| `cancel_job` | Set a cancellation flag in the JobStateDO that the Container observes between phases. |
| `docs` | Search this canon (BM25 over `canon/`); see *Relationship to oddkit* below. |
| `telemetry_policy` | Returns the governance policy describing what the server tracks and why. |
| `telemetry_public` | SQL against the `appbuilder_telemetry` Analytics Engine dataset. Use `SUM(_sample_interval)`, not `COUNT(*)`. |
| `telemetry_schema` | (When present) returns the blob/double position-to-name mapping plus query examples. Coupled to schema-as-source-of-truth work. |

If the deploy's `/health` reports a tool not listed here, trust the deploy
— this article is informational, not the contract.

---

## Where to ask follow-up questions

The `docs` tool indexes every Markdown file under `canon/`. A natural-
language query is the right shape — keywords work but full questions work
better because the index is BM25 over content, not just titles.

Operational questions and the article that answers them:

| Question | Best query | Article retrieved |
|---|---|---|
| How do I build a payload? | `payload construction` | `canon/articles/payload-construction.md` |
| What does `failure_mode: "soft"` mean? | `failure mode taxonomy` | `canon/articles/failure-mode-taxonomy.md` |
| How does an end user install the APK? | `apk installation` | `canon/articles/apk-installation.md` |
| What's signed how, and when do I supply my own keystore? | `bundled debug keystore` *or* `keystore reuse` | `canon/articles/bundled-debug-keystore.md`, `canon/articles/keystore-reuse.md` |
| What does the SAB CLI surface look like? | `cli reference` | `canon/articles/cli-reference.md` |
| End-to-end recipe from payload to running app? | `workflow recipes` | `canon/articles/workflow-recipes.md` |
| How do I diagnose a stuck build? | `diagnostic patterns` | `canon/articles/diagnostic-patterns.md` |
| How does book/chapter selection work in SAB? | `book collections` | `canon/articles/book-collections.md` |

The index updates whenever new articles land in `canon/articles/`. The
deploy does not need a redeploy for `docs` queries to find them — oddkit
fetches the repo's canon at query time.

---

## Relationship to oddkit

The `docs` tool is a thin proxy over [`oddkit`](https://github.com/klappy/oddkit) —
the open-source MCP server that gives AI agents a canon-retrieval +
epistemic-discipline layer. `appbuilder-mcp`'s `src/docs.ts` opens an MCP
session against `https://oddkit.klappy.dev/mcp` with `knowledge_base_url`
pinned to this repo, runs `search` and (at depth ≥ 2) `get`, and returns a
unified `{ answer, sources, deeper, governance_source }` envelope. The
appbuilder server holds zero retrieval logic; oddkit does the BM25 work.

Two consequences worth knowing:

1. The `governance_source` field tells you whether oddkit was able to load
   the configured canon (`"knowledge_base"`) or fell through to a minimal
   bundled tier (`"minimal"`). A `"minimal"` envelope is a signal that
   the configured canon path could not be resolved; treat the answer as
   weaker.
2. Agents that want richer epistemic operations (`orient`, `challenge`,
   `encode`, `validate`) can connect directly to oddkit at
   `https://oddkit.klappy.dev/mcp` and pass `knowledge_base_url=https://github.com/klappy/appbuilder-mcp`.
   The repo-level `AGENTS.md` (visible only if you cloned the repo)
   documents the expected `oddkit_*` rhythm.

The first-call cold-start of `docs` against a freshly-warmed Worker can
hit `MCP error -32001: Request timed out` at the upstream-oddkit hop. A
short retry resolves it; subsequent calls in the same MCP session are
fast.

---

## Relationship to ptxprint-mcp

`klappy/ptxprint-mcp` is the sister MCP server for PTXprint typesetting,
and the architectural pattern this server forks. The two repos are kept
deliberately structurally similar: same Worker + Container + DO + R2
shape, same tool naming (`submit_typeset` ↔ `submit_build`), same canon
layout under `canon/`. A live parity matrix lives at
[`docs/parity-matrix.md`](https://github.com/klappy/appbuilder-mcp/blob/main/docs/parity-matrix.md)
in the source repo; consult it when something feels structurally off.

If you came to `appbuilder-mcp` from `ptxprint-mcp` (or vice versa): tools,
payload shapes, and `failure_mode` semantics carry over. The domain
content (USFM vs. PTXprint configs; APKs vs. PDFs; signing vs.
typesetting) is what differs.

---

## Mistakes new agents make

Documented patterns from prior sessions:

- **Trusting the README's tool list over `/health`.** The README ages; the
  deploy is current.
- **Skipping `notifications/initialized`** between MCP `initialize` and
  the first `tools/call`. The spec requires it; without it the server
  rejects subsequent calls.
- **Forgetting `mcp-session-id` after `initialize`.** Capture it from the
  `initialize` response and echo it on every subsequent request.
- **Submitting and polling without a timeout budget.** A cold-cache
  Container build pulls a ~1.7 GiB image; expect minutes, not seconds.
  Cache hits return in under a second.
- **Treating a `docs` `governance_source: "minimal"` envelope as
  authoritative.** It means oddkit could not load the configured canon
  and fell through to a minimal tier; ask again or surface the gap.
- **Asking the `docs` tool questions about appbuilder-mcp's deploy
  posture.** Until this article landed, those queries returned irrelevant
  SAB-domain articles. The fix is this article; if a query still
  misses, that is a coverage gap worth raising.

---

## What this article is not

- **Not the v1 spec.** That lives in
  [`canon/specs/appbuilder-mcp-v1-spec.md`](https://github.com/klappy/appbuilder-mcp/blob/main/canon/specs/appbuilder-mcp-v1-spec.md).
- **Not the SAB CLI reference.** That lives in
  `canon/articles/cli-reference.md`.
- **Not the operator deploy recipe.** That lives in `DEPLOY.md` (clone
  required) and any future `canon/governance/` deploy article.
- **Not stable.** The tool surface evolves; the discovery loop above is
  what stays stable. If a tool name in the table above no longer matches
  `/health`, trust `/health`.
