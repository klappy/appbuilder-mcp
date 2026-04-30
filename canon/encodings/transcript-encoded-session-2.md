---
title: "appbuilder-mcp Server — Transcript Encoding Session 2 (2026-04-30 deploy-discipline correction)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "transcript", "dolceho", "session-2", "deploy", "workers-builds", "github-integration", "correction"]
extends: "transcript-encoded-session-1.md"
encoded_at: 2026-04-30T21:55:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/bootstrap/model-operating-contract
  - klappy://BUILD (ptxprint-mcp — the operator's existing canonical deploy pattern)
companion_artifacts:
  - "BUILD.md (rewritten — v1.0 first-time setup + Workers Builds GitHub integration)"
---

# appbuilder-mcp Server — Transcript Encoding Session 2

> Brief correction session immediately following session 1. Operator
> caught a doc lie in `BUILD.md`: the version session 1 shipped told
> readers to `wrangler deploy` for ongoing changes. The operator's
> actual discipline is "we do not deploy — we set up GitHub hooks from
> the CF dashboard." This was already canonical in
> `klappy://BUILD` (ptxprint-mcp); session 1's BUILD.md ignored that
> pattern and reverted to generic Cloudflare instructions.
>
> ID continuity: session 1 used D-001..D-006, O-001..O-005, L-001..L-003,
> C-001..C-006, H-001..H-004. Session 2 continues at D-007 / L-004 /
> Open-005.

---

## D — Decisions

### D-007 — `BUILD.md` mirrors ptxprint-mcp's Workers Builds GitHub integration pattern

`BUILD.md` is rewritten from the ptxprint-mcp template, with explicit:

- **Pushes to `main` auto-deploy via Cloudflare Workers Builds** (the CF
  dashboard's GitHub integration; not GitHub Actions).
- **Do not run `wrangler deploy` manually** after the one-time initial
  bootstrap. Manual invocations conflict with the Workers Builds
  pipeline.
- **The only `wrangler deploy` invocation is the very first one**, which
  creates the Durable Object SQLite tables and lets the GitHub
  integration take over.

**Operator framing (this session):** *"WE DO NOT DEPLOY. We setup
Githooks from CF dashboard."*

**Rationale.** Two principles converge here:

1. *DRY canon says it once* (`klappy://canon/principles/dry-canon-says-it-once`).
   ptxprint-mcp's BUILD.md already documents this pattern as the operator's
   default for oddkit-pattern MCP servers on Cloudflare. appbuilder-mcp
   should mirror, not redefine.
2. *Reality is sovereign* (Axiom 1). The session 1 BUILD.md described a
   workflow that was not how the operator actually deploys. Doc lies that
   contradict ground truth are worse than missing docs — readers act on
   them.

**Cross-ref.** `BUILD.md` (rewritten);
`klappy://BUILD` (ptxprint-mcp source pattern).

---

## L — Learnings

### L-004 — Search canon for operator-discipline patterns before authoring repeat documentation

Session 1 wrote BUILD.md from generic Cloudflare-Workers Quickstart
templates rather than searching ptxprint-mcp's BUILD.md first. The
ptxprint-mcp BUILD.md exists, is canonical, and was discoverable via a
single `oddkit_search` for "deploy github cloudflare." The operator's
correction surfaced a pattern that was already canon, two clicks away.

**Pattern recognized.** The operator's instruction at session 1 —
*"learn from and leverage klappy/ptxprint-mcp as reference"* — applied
to BUILD.md, not just code and spec. Generic documentation patterns are
where operator-specific discipline most commonly diverges from upstream
defaults, *because* they're the parts vendors document for the average
case rather than the specific operator's pipeline.

**Rule going forward.** When authoring any documentation analog of a doc
that exists in the sister repo (BUILD, ARCHITECTURE, CONTRIBUTING, top-level
README, top-level CI configs), `oddkit_search` the sister overlay first
and copy-with-provenance, exactly as we already do for canon articles. Do
not re-derive from vendor docs unless the sister explicitly says "use
vendor docs here."

**Cross-ref.** L-002 (session 1) already established this rule for canon
articles; L-004 extends it to top-level repo docs. Generalization:
*"When an operator says 'model after X,' the sister-repo overlay
includes everything in X's tree, not just `canon/`."*

---

## O — Observations (closed)

### O-006 — `klappy://BUILD` (ptxprint-mcp) was already authoritative for this pattern

A single `oddkit_search` against
`https://github.com/klappy/ptxprint-mcp` for *"github hooks cloudflare
dashboard deploy do not deploy"* surfaced `klappy://BUILD` as the top
hit with the exact policy verbatim:

> **"Do not run `wrangler deploy` manually."** It would conflict with
> the Workers Builds pipeline and isn't necessary.

This was discoverable in session 1 with the same one-call cost. The
deficiency was authoring discipline, not retrieval cost.

---

## H — Handoffs (no new handoffs; updates to existing)

### Update — H-002 (first end-to-end build) deploy mechanics

The H-002 handoff in session 1 said *"depends on Cloudflare deploy."* The
correct phrasing under the operator's discipline:

> H-002 depends on the operator (a) running the one-time
> `wrangler deploy` from a clean checkout to bootstrap the Durable
> Object SQLite tables, then (b) configuring the Workers Builds GitHub
> integration in the CF dashboard against this repo. Once those two
> steps land, every push to `main` auto-deploys, and H-002 becomes
> "submit a smoke payload to the live Worker, verify
> `failure_mode = success`, and encode the result."

H-002's blocking step is operator-side, not code-side. The Worker code is
ready to deploy.

---

## Open Items

### Open-005 — Initial `wrangler deploy` not yet run

The Cloudflare Workers Builds GitHub integration cannot be configured
until the very first `wrangler deploy` lands (it needs the Worker to
exist on the operator's CF account before "Connect repository" is a
valid action). The first deploy creates:

- Durable Object SQLite tables for `AppbuilderMcp`, `JobStateDO`,
  `AppbuilderContainer` (per `migrations: [{ tag: "v1", new_sqlite_classes: [...] }]`).
- The container image upload to CF's container registry.
- The Worker route and the workers.dev hostname registration.

After that one-time bootstrap, all changes flow through `git push`. This
Open Item is operator-side — the canon documents the path; the action is
the operator's.

---

## Provenance

This encoding follows the same DOLCHEO+H format as session 1, with the
explicit `extends:` frontmatter pointer per ptxprint-mcp's session-7
pattern (which extends session-6, which extends session-5, etc. —
sister-session continuity is canonical).
