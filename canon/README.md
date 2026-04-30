---
title: "appbuilder-mcp Canon — Directory Index"
audience: project
exposure: nav
voice: instructional
stability: working
tags: ["canon", "appbuilder", "mcp", "index", "navigation"]
date: 2026-04-30
status: working
governs: "the canon overlay for klappy/appbuilder-mcp; not authoritative for klappy.dev or other repos"
derives_from: "klappy://canon/README (ptxprint-mcp canon README — same structural pattern)"
---

# appbuilder-mcp Canon Directory

> Operational and design knowledge specific to klappy/appbuilder-mcp. Forks
> the structural pattern of `klappy://canon/README` (in ptxprint-mcp). When
> a doc here derives from a sister doc in ptxprint-mcp, the frontmatter
> `derives_from:` carries the explicit URI of the source — no silent copies.

## What lives here

- **`specs/`** — versioned specifications. The current target is
  `specs/appbuilder-mcp-v1-spec.md`.
- **`articles/`** — agent-facing operational knowledge. How to construct a
  payload, what the SAB CLI surface looks like, how the bundled debug keystore
  works, the three failure modes.
- **`governance/`** — load-bearing constraints (telemetry policy, future
  release-validation gates). Authoritative for runtime behavior of this
  Worker.
- **`handoffs/`** — explicit hand-offs to a future session, agent, or
  upstream. Carries the context the receiving party needs to proceed
  without having to re-read everything.
- **`encodings/`** — DOLCHEO+H session journals. What was decided, observed,
  learned, constrained, handed off, and what remains open. The narrative
  history of the project.
- **`templates/`** — reusable starting payloads (e.g. minimal English
  Bible APK).

## How to navigate

For agents wiring up against this MCP server, start with:

1. `klappy://canon/specs/appbuilder-mcp-v1-spec` — what the server does and how.
2. `klappy://canon/articles/payload-construction` — how to build a `submit_build` payload.
3. `klappy://canon/articles/cli-reference` — the underlying SAB CLI surface, useful when debugging.

For maintainers picking up the project:

1. `klappy://canon/encodings/transcript-encoded-session-1` — the bootstrap session journal.
2. `klappy://canon/handoffs/burrito-tag-handoff` — the next concrete container swap.
3. `klappy://canon/governance/telemetry-governance` — what we track and why.

## Provenance

This canon overlay is forked from `klappy/ptxprint-mcp` per
operator decision D-006 (encoded in
`encodings/transcript-encoded-session-1.md`). Where docs are direct
derivatives, the source URI lives in frontmatter. Where they are
AppBuilder-specific (the SAB CLI surface, the keystore pattern, the burrito
handoff), they stand on their own and cite ptxprint-mcp only as
*structural-pattern source*, not content source.

## Conventions

- Frontmatter is YAML. Required fields: `title`, `audience`, `voice`,
  `stability`, `tags`, `date`, `status`. `derives_from` is required when
  the doc has a sister in another repo.
- URIs use the `klappy://` scheme. Within this repo, `klappy://canon/...`
  resolves to a file under this directory.
- "non-canonical" in frontmatter (`canonical_status: non_canonical`) means
  the doc is operational reference material, not load-bearing constraint.
  Specs and governance docs are canonical; articles are typically not.
