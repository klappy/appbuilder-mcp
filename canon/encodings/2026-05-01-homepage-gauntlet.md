---
uri: klappy://appbuilder-mcp/canon/encodings/2026-05-01-homepage-gauntlet
title: "Session — Homepage Gauntlet for klappy/appbuilder-mcp"
audience: canon
session_date: 2026-05-01
mode: planning → ready-to-execute
artifact_in: appbuilder-mcp-homepage-mockup-v2.html
gauntlet: orient → search → preflight → challenge → validate → encode
tags: ["appbuilder-mcp", "homepage", "gauntlet", "session-encoding", "dolcheo-h"]
---

# Session — Homepage Gauntlet for klappy/appbuilder-mcp

**Date:** 2026-05-01
**Mode:** Planning (gate to execution pending operator answers on three open questions)
**Operator:** klappy
**Artifact under review:** `appbuilder-mcp-homepage-mockup-v2.html`

---

## D — Decisions made this session

1. **Family resemblance over visual copy.** The appbuilder-mcp homepage adopts the editorial folio language of ptxprint.klappy.dev (§ I–§ VII roman numerals, masthead, specimen plates, colophon, MMXXVI dating) but takes a distinct visual identity: dark-ink hero with a phone-frame specimen as the focal visual, transitioning to warm linen body. *Folio II* declared.
2. **Tool naming aligns with PTXprint pattern.** `submit_build` (action+specific), `get_job_status` (action+job), `cancel_job` (action+job). The polling/cancellation tools use the generic `job` noun, not `build`. Mirrors PTXprint's `submit_typeset` / `get_job_status` / `cancel_job`.
3. **Six-tool surface acknowledged.** The homepage spotlights the three async build tools but explicitly notes the full surface (`docs`, `telemetry_public`, `telemetry_policy`) and warns "the deploy is authoritative" — directly mirroring PTXprint canon's anti-drift posture.
4. **Pinned dependency: SAB v14.0** (released 2026-04-24), mirroring how PTXprint pins `sillsdev/ptx2pdf` at `3.0.20`.
5. **Honest project status:** Phase 0 / Specification drafting. Status indicator is amber, not green. Hero pill reads "MCP · PHASE 0 · SPECIFICATION DRAFTING," statusbar reads "tools enumerated, server unbuilt."
6. **Telemetry empty-state:** all leaderboards render `—` and "no events yet" until the deploy lights up. No fabricated numbers shipped on the live page.
7. **Vodka architecture credited to broader klappy canon.** Coinage is shared across oddkit + ptxprint-mcp + appbuilder-mcp; not original to this page.

## O — Observations during gauntlet

1. **PTXprint repo README explicitly warns:** "current tool surface is whatever the live deploy reports... README enumerations drift, the deploy is authoritative." V1 of the mockup hard-coded 3 tools without that disclaimer. Addressed in v2.
2. **PTXprint live tool surface is six tools, not three.** Core async (`submit_typeset` / `get_job_status` / `cancel_job`) + `docs` + `telemetry_public` + `telemetry_policy`. The "three async tools" framing is the headline, not the totality.
3. **SAB age was misstated as forty years.** Actual: first public release April 2015 (≈11 years). PTXprint's "fifty years of Paratext and XeTeX craft" is defensible because XeTeX descends from TeX (1978). SAB does not have that lineage. Corrected to "A decade of Scripture App Builder craft."
4. **The reference site uses many em dashes.** This is house style, not an AI cliché tell. V2 leaves em-dash usage intact.
5. **No `appbuilder-mcp` repo currently visible to public web search.** Consistent with Phase 0 status — repo may exist under operator's account but is private or unindexed.
6. **The phone-mock content (Guahibo NT in Spanish) is invented.** Pastor Arcesio quote is real and verifiable against SIL materials. Demo console payloads are illustrative.

## L — Learnings to graduate

1. **Mockup-then-validate is more honest than spec-then-build.** Producing the page before validating against canon surfaced six factual/discipline issues that a spec-first approach would have buried in prose. Family resemblance to a sibling project is the cheapest validation surface — diff the new page against the deployed one and the gaps are obvious.
2. **Marketing copy is a strong-claim surface.** The challenge classifier matched seven types simultaneously (principle-extraction, pattern-coinage, proposal, observation, strong-claim, assumption, comparative-positioning). Headlines and pull-quotes always trigger more pressure-test prerequisites than body prose. Plan editing time accordingly.
3. **Empty-state telemetry is a feature, not a placeholder.** Showing `—` on a fresh deploy advertises the transparency commitment more credibly than fabricated numbers ever could. Other pre-launch MCP server pages should adopt the same posture.

## C — Constraints active for execution

1. **Tool-name discipline:** The Worker's `tools/list` MUST return `submit_build` / `get_job_status` / `cancel_job` (plus `docs`, `telemetry_public`, `telemetry_policy`). The page is now consistent with this. Implementation must match.
2. **No fabricated demo numbers in production.** Any payload, telemetry value, or build artifact shown on the live site must come from a real smoke fixture or render `—`.
3. **Definition-of-done items inherited from `klappy://canon/constraints/definition-of-done`** apply to the deployment PR: visual proof, test output, decisions referenced.
4. **AI voice cliché audit (`klappy://canon/constraints/ai-voice-cliches`)** must be re-run on any new copy added between now and merge.
5. **Vodka architecture / KISS / DRY canon / mode discipline / verification-requires-fresh-context / no-lie-in-wait static indexes** are all inherited from broader klappy canon and govern both the page copy and the implementation.

## H — Handoffs to next session (= deployment session)

The next session begins with this artifact set:

- `/mnt/user-data/outputs/appbuilder-mcp-homepage-mockup-v2.html` — design source-of-truth
- `/mnt/user-data/outputs/03-hero-v2.png` and `04-full-page-v2.png` — visual proof
- This encoding (`klappy://appbuilder-mcp/canon/encodings/2026-05-01-homepage-gauntlet`) — the contract

Next-session tasks (execution mode):
1. Scaffold the `klappy/appbuilder-mcp` repo with the same shape as `klappy/ptxprint-mcp` (`canon/` + `container/` + `smoke/` + `src/` + `wrangler.jsonc` + Worker with `/mcp`, `/health`, static-asset bundle).
2. Port the v2 HTML into `src/static/index.html` (or equivalent) with a build-time inlining of static assets.
3. Wire the Worker to inject live `/diagnostics/version`, `/diagnostics/schema`, and `tools/list` results into the page so the "deploy is authoritative" claim is mechanically enforced.
4. Wire the telemetry panels to `appbuilder_telemetry` Analytics Engine queries with the same SQL-rewrite pattern as PTXprint.
5. Open the PR against `klappy/appbuilder-mcp:main`.

## O+ — Open questions for the operator

These are the only items blocking the deployment session. They cannot be answered without operator input:

1. **Subdomain confirmation.** Is `appbuilder.klappy.dev` registered and routable to the new Worker? Or is a different name preferred?
2. **Container size.** Is `standard-3` (2 vCPU / 12 GiB) the right default? Android SDK + Gradle + aeneas + eSpeak + iOS toolchain is heavier than PTXprint's `standard-2`.
3. **Smoke-fixture project names.** Is `guahibo-nt` an actual fixture you intend to ship, or should the demo use one of the public Komba / BSB / Cuiba projects already in the SIL ecosystem? The phone-mock language and audio metadata should match a real, shippable fixture before launch.
4. **Signing-keys vault.** Phase 1 launch with Worker secrets per project, or punt key management to Phase 2 and ship the demo with debug-flavor APKs only?
5. **Acknowledgement of Phase 0 status on the homepage.** The current honest framing is `Phase 0 · Specification drafting`. If you'd prefer `Pre-spec`, `Phase 1 · scaffold`, or any other label, name it.

## E — Encoding metadata

- **Format:** DOLCHEO+H session encoding (Decisions, Observations, Learnings, Constraints, Handoffs, Encoding metadata, Open questions).
- **Authority:** `klappy://canon/definitions/dolcheo-vocabulary`.
- **Persist:** Save to `klappy/appbuilder-mcp/canon/encodings/2026-05-01-homepage-gauntlet.md` when the repo is scaffolded. Until then, lives at `canon/encodings/2026-05-01-homepage-gauntlet.md`.
