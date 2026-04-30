---
title: "appbuilder-mcp Server — Transcript Encoding Session 4 (2026-04-30 burrito-tag pin closes H-001)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "transcript", "dolceho", "session-4", "container", "dockerfile", "burrito", "scripture-burrito", "schema", "v1.1"]
extends: "transcript-encoded-session-3.md"
encoded_at: 2026-04-30T22:20:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/values/axioms (Reality Is Sovereign; A Claim Is a Debt; You Cannot Verify What You Did Not Observe)
  - klappy://canon/bootstrap/model-operating-contract
companion_artifacts:
  - "Dockerfile (single APP_BUILDERS_IMAGE ARG, pinned to ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito)"
  - "src/payload.ts (BibleSourceSchema kind enum extended to {usfm_zip, usx_zip, burrito_zip}; schema_version union of literal '1.0' and '1.1')"
  - "container/main.py (BibleSourceModel docstring + kind comment include burrito_zip)"
  - "canon/handoffs/burrito-tag-handoff.md (status: complete; resolved_at, resolved_by, resolution_evidence frontmatter)"
  - "canon/specs/appbuilder-mcp-v1-spec.md (version: v1.1-draft; §1 burrito in scope; §4 schema reflects union + enum; §5 image bullet pinned to stg)"
  - "canon/articles/payload-construction.md (bible_source enum extended; burrito worked example)"
  - "BUILD.md (Current state — Container image line, spec target v1.1-draft)"
  - "README.md (diagram base updated; v0.1 ships line includes burrito; Status section rewritten with H-001 closed and H-002/H-006 active)"
  - "ARCHITECTURE.md (diagram base updated)"
---

# appbuilder-mcp Server — Transcript Encoding Session 4

> Operator delivered the burrito-capable upstream tag — a staging-branch
> image at `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`
> rather than a production tag. This session lands the Container-only
> swap that closes H-001 (the burrito-tag handoff) without changing any
> Worker-side cache, schema-canonicalization, or DO state-machine code.
> The schema bumps to v1.1 (strict-extension union; 1.0 payloads remain
> valid). H-006 opens to track the Workers Builds deploy of the new
> image.
>
> ID continuity: session 1 used D-001..D-006, O-001..O-005, L-001..L-003,
> C-001..C-006, H-001..H-004; session 2 added D-007, L-004, O-006,
> Open-005; session 3 added D-008, L-005, O-007..O-008, Open-006,
> H-005 (closed). Session 4 continues at D-009, D-010, O-009, O-010,
> L-006, H-006, Open-007, Open-008. H-005 is superseded by H-006
> (same surface — Workers Builds deploy observation — different image).

---

## D — Decisions

### D-009 — Pin Container FROM to `appbuilder-agent-stg:feature-scripture-burrito` (lands burrito support; closes H-001)

The Container's FROM image moves from
`ghcr.io/sillsdev/appbuilder-agent-prd:latest` (D-008, session 3) to
`ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`. This
is the operator-delivered burrito-capable build of the SIL App Builder
agent — the staging branch's published image, not a production tag.

**Trigger.** The handoff `canon/handoffs/burrito-tag-handoff.md`
described the work that becomes possible "once the operator delivers a
burrito-capable upstream tag." The operator delivered. The session-3
default of `:latest` on the production repo cannot service
`bible_source.kind: "burrito_zip"`; the staging branch can.

**Operator framing.** *"the burrito branch is published as
appbuilder-agent-stg:feature-scripture-burrito; pin that and bump the
schema."*

**Rationale.**

1. *Reality is sovereign.* Burrito format requires the upstream branch
   that knows how to read it. No amount of payload-schema work in our
   repo can make `agent-prd:latest` accept burrito zips; the SAB CLI
   inside that image lacks the format detector. The runtime image is
   the only place the change can land.
2. *Maintainability — one person indefinitely.* Pinning to a named
   feature branch is uncomfortable (Open-007 tracks the promotion to
   `prd:<tag>`), but it is more honest than chasing a moving `:latest`
   target on the staging repo. When the upstream PR merges, we re-pin
   to a stable production tag — a one-line change.
3. *DRY canon.* The handoff's "what changes / what does not / validation
   / rollback" structure was written exactly for this transition; we
   follow it.

**Cross-ref.** Closes H-001 (the burrito-tag handoff). Opens Open-007
(promote to prd) and Open-008 (single-platform amd64 manifest;
observe). Triggers H-006 (Workers Builds deploy observation for the new
image).

### D-010 — Collapse `APP_BUILDERS_TAG` ARG to single `APP_BUILDERS_IMAGE` ARG

The Dockerfile's two-line pattern

```dockerfile
ARG APP_BUILDERS_TAG=latest
FROM ghcr.io/sillsdev/appbuilder-agent-prd:${APP_BUILDERS_TAG}
```

becomes

```dockerfile
ARG APP_BUILDERS_IMAGE=ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito
FROM ${APP_BUILDERS_IMAGE}
```

**Trigger.** D-009 needed to override not just the tag but the
repository name (`agent-prd` → `agent-stg`). With two coupled ARGs
(image-name and tag), an override has to set both — and forgetting
either silently produces a working FROM line that pulls the wrong
combination. Collapsing to one ARG eliminates that whole class of
mistake.

**Operator framing.** *(implicit, derived from D-009)*

**Rationale.**

1. *KISS — simplicity is the ceiling.* One substitution point cannot
   contradict itself; two coupled ARGs can.
2. *DRY canon.* The image reference is one fact; representing it as one
   variable matches.
3. *Backwards-incompatible only at the build-arg surface.* Anyone
   overriding `APP_BUILDERS_TAG` from a CI pipeline now needs to update
   to `APP_BUILDERS_IMAGE`. Inside this repo there are no such
   overrides today (Workers Builds uses the default).

**Cross-ref.** Companion to D-009. The Dockerfile comment block
documents both decisions and points at this encoding.

---

## O — Observations (closed)

### O-009 — Manifest verification of `appbuilder-agent-stg:feature-scripture-burrito` (Reality-Is-Sovereign check before pinning)

Direct anonymous pull against `ghcr.io/v2/sillsdev/appbuilder-agent-stg`
returned:

- **HEAD manifest:** `HTTP/2 200`, `docker-content-digest:
  sha256:b59ddf6160523a22b141959a79c2bc82648693953ebf6e5b29ec2597979e499c`,
  `content-type: application/vnd.docker.distribution.manifest.v2+json`.
- **Manifest body:** `schemaVersion: 2`, 11 layers, total compressed
  bytes 1,821,344,228 (~1.70 GiB).
- **Config blob (digest
  `sha256:dacd25fd8fe3cedf573c339b56be056b950405b025089a1b2c7a5bffd4aab417`):**
  - `architecture: amd64`, `os: linux` (single platform — no manifest
    list).
  - `Cmd: ['/sbin/my_init']` (phusion baseimage init, same as agent-prd).
  - `WorkingDir: /ansible` (ansible toolchain mount; the image is
    visibly built by `sillsdev/docker-appbuilder-agent`).
  - `Env: PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
    `LANG=en_US.UTF-8`.
  - 20 history entries; the most recent three:
    `COPY ansible /ansible`, `WORKDIR /ansible`,
    `RUN ... VERSION_SAB=14.0 VERSION_RAB=14.0 VERSION_DAB=14.0
    VERSION_KAB=14.0 ... mkdir -p /etc/ansible && echo loca[lhost ...]`
    (truncated; this is the ansible playbook invocation that installs
    the four App Builder CLIs).
  - Image was built **2026-04-30T21:54:48** — fresh as of session
    start.

**Closure rule.** This is the L-005 inspection-before-pinning step
applied to the burrito image. The manifest looks structurally identical
to `agent-prd` (phusion + ansible + 4 SAB CLIs); the only delta should
be SAB itself, which now reads burrito zips. We pin and let the
Workers Builds pipeline + first end-to-end smoke (H-002) be the
runtime confirmation.

### O-010 — Handoff closure pattern: status frontmatter + resolution_evidence list

`canon/handoffs/burrito-tag-handoff.md` was updated with frontmatter

```yaml
status: complete
resolved_at: 2026-04-30
resolved_by: "session-4 (claude); pinned via Dockerfile ARG APP_BUILDERS_IMAGE"
resolution_evidence:
  - "Dockerfile pins ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito"
  - "manifest digest sha256:b59ddf61...e499c (verified via ghcr.io/v2 GET, single amd64 platform)"
  - "src/payload.ts BibleSourceSchema accepts kind='burrito_zip' and schema_version ∈ {'1.0','1.1'}"
  - "container/main.py BibleSourceModel docstring + kind comment updated"
  - "canon/encodings/transcript-encoded-session-4.md D-009, D-010, O-009, O-010, H-006"
  - "End-to-end smoke build (H-002) is the next milestone — closing this handoff lands the code+image surface; the smoke validates the runtime."
```

**Closure rule.** The body of the handoff (Trigger / What changes / What
does not / Validation / Rollback) is preserved as durable record.
Future sessions can read it to understand the change that landed
without re-deriving the rationale. The `status: complete` flip and the
evidence list make it discoverable as "done" via canon-grep.

This pattern is candidate-canon for `klappy://canon/articles/handoff-closure`
(not yet written; deferred to a session that closes a second handoff
and can generalize). For now it lives as the handoff's own example.

---

## L — Lessons (canon-eligible)

### L-006 — "Dead weight" is a measurable claim, not an aesthetic

Session-1 D-002 rejected the agent-prd image partly on the grounds that
its CodeBuild-era surface (awscli, fastlane-supply, ruby) was "dead
weight" — bytes that wouldn't be exercised at runtime. Session 3
revealed the cost of that aesthetic framing: D-002 was wrong, and the
"dead weight" rationale read in retrospect as a vibe rather than a
measurement. This session's manifest inspection put a number on it:
1.70 GiB compressed for `agent-stg:feature-scripture-burrito`, of which
the awscli/fastlane/ruby layer is ~100 MiB. That is 5–6 % of the image
— well inside the noise of CF Container's `standard-3` 20 GiB disk
budget.

**Rule.** Before invoking "this is bloat" or "this is dead weight" as
a reason to choose architecture A over B, get the number. Compressed
size, layer count, exercised-at-runtime fraction. If the number is in
the noise, the framing is aesthetic and should not be load-bearing in
the decision.

**Provenance.** Born out of D-002 (session 1, rejected agent-prd on
unmeasured "dead weight") → D-008 (session 3, reversed D-002 after the
build error proved the bare image unusable) → D-009 (this session,
pinned `agent-stg:feature-scripture-burrito` and measured the layer
sizes). Three sessions of compounding cost paid because no one ran
`docker manifest inspect` until forced.

---

## C — Constraints (none new)

This session adds no new constraints. C-001..C-006 carry forward
unchanged.

---

## H — Handoffs

### H-001 — CLOSED (burrito-tag handoff)

`canon/handoffs/burrito-tag-handoff.md` flips to `status: complete`
this session per O-010. Future "what does v1.1 add over v1.0" reads
land on the closed handoff plus this encoding's D-009.

### H-006 — ACTIVE: observe Workers Builds deploy of the burrito-pinned image

**One-line scope.** Session-4's commit, when pushed to `main`, triggers
a Workers Build that pulls the 1.70 GiB
`appbuilder-agent-stg:feature-scripture-burrito` image, runs the same
Dockerfile RUN block (pip install + keytool + COPY container/main.py)
that worked on `agent-prd:latest` in session 3, and re-deploys the
Worker. H-006 stays active until `/health` returns 200 against the new
deploy and (ideally) a smoke job dispatched to the Container confirms
the SAB CLI still resolves at `/usr/local/bin/scripture-app-builder`.

**Trigger.** D-009 + D-010 land in code and canon this session. The
operator's discipline rule (canon: do-not-deploy-manually) means the
push is the deploy.

**Validation.**

1. `git push` to `main` triggers Workers Builds (visible in CF dashboard
   → Workers & Pages → appbuilder-mcp → Deployments).
2. Build log shows pull of the new image (look for the digest
   `sha256:b59ddf61...e499c` in the pull section, or at least a
   ~1.7 GiB pull and a different layer count than session-3's
   agent-prd:latest).
3. `pip install -r container/requirements.txt --break-system-packages`
   succeeds (same as session-3).
4. `keytool -genkey ...` debug-keystore step succeeds.
5. `COPY container/main.py /app/main.py` succeeds.
6. Deploy completes; `curl https://appbuilder-mcp.klappy.workers.dev/health`
   returns 200 with `version: 0.1.0`.
7. **Optional but valuable**: dispatch a smoke job (perturb the `name`
   field to force a fresh hash and a cold container) — verify the
   container instance pulls and starts, even if the SAB invocation
   doesn't end-to-end-succeed yet (that's H-002).

**Closure rule.** When the deploy lands and `/health` is 200, encode
**O-011** in session-5 with the deploy id, build duration, and any
observed pitfalls. Close H-006 in that encoding's H section.

**Rollback.** If the burrito image's RUN-line behavior diverges from
agent-prd in a way that breaks the build (e.g., missing `pip3` or
`keytool`), revert the Dockerfile ARG default to
`ghcr.io/sillsdev/appbuilder-agent-prd:latest` and reopen H-001 with
the failure log attached. The schema changes in `src/payload.ts` are
forward-compatible and can stay in place; the Container will reject
`burrito_zip` payloads at runtime with a hard-failure log message
until the image is repinned.

### H-002 — STILL ACTIVE: first end-to-end smoke build

Carries forward from session 1. After H-006 closes, the next milestone
is to dispatch the canonical `eng-web_usfm.zip` fixture as
`schema_version: "1.0"`, `bible_source.kind: "usfm_zip"` and verify
`failure_mode: "success"` then resubmit byte-identical for the cache
hit. A burrito-format smoke is a stretch goal for the same session if
a fixture is in hand.

### H-003 — STILL ACTIVE: telemetry-governance fresh-context review

Carries forward unchanged from session 1.
`canon/governance/telemetry-governance.md` retains
`status: draft_pending_fresh_review`.

### H-005 — SUPERSEDED by H-006

Session-3's H-005 (observe the Workers Builds redeploy after the
agent-prd FROM-line fix) closed when `/health` returned 200 against
commit `7c120ac`. H-006 is the next instance of the same surface
(Workers Builds deploy observation) for a different image.

---

## E — Externals (none new)

No new external dependencies introduced. The
`appbuilder-agent-stg:feature-scripture-burrito` image is a pin against
an existing dependency (the SIL `docker-appbuilder-agent` pipeline);
the relationship is unchanged, only the tag.

---

## O — Open items (forward)

### Open-007 — Promote `agent-stg:feature-scripture-burrito` → stable `agent-prd:<tag>`

Once the upstream `feature-scripture-burrito` PR merges to
`docker-appbuilder-agent`'s master, a stable
`appbuilder-agent-prd:<release-tag>` will publish. At that point we
re-pin `APP_BUILDERS_IMAGE` to the prd tag and re-deploy. This is a
one-line Dockerfile change + one-session encoding.

**Trigger.** Watch the upstream PR (link to be tracked when known) or
poll `ghcr.io/v2/sillsdev/appbuilder-agent-prd/tags/list` for new
tags. No action required until the merge lands.

**Risk if ignored.** Staging-branch images can be force-pushed or
deleted by the upstream maintainers. We do not control retention. If
the tag disappears between now and the prd promotion, our deploys
break and we revert to `agent-prd:latest` (no burrito support) or pin
to the manifest digest
`sha256:b59ddf6160523a22b141959a79c2bc82648693953ebf6e5b29ec2597979e499c`
(burrito support, but no longer named).

### Open-008 — Single-platform amd64 manifest

The burrito image's manifest is a flat single-architecture v2 manifest
(amd64/linux), not a multi-arch manifest list. CF Containers run amd64
today, so this matches; if the upstream pipeline starts producing
multi-arch images later, our deploy is unaffected (Docker pulls
amd64 by default on amd64 runners). **Observe; encode if it surfaces
as a problem.**

### Open-006 — Image disk-margin observation

Carries forward from session 3. The agent-stg image is 1.70 GiB
compressed (agent-prd:latest at session-3 was ~1.74 GiB; the delta is
within build-to-build noise). First cold Gradle cache build is the
worst case for disk usage; observe in H-002.

### Open-005 — CLOSED in session 3

Carried for ID continuity only.

---

## H+ — Pending heuristics

None new this session.

---

## ID continuity through session 4

- **D**: D-001..D-010
- **O**: O-001..O-010
- **L**: L-001..L-006
- **C**: C-001..C-006
- **H**: H-001 (closed by O-010 + D-009), H-002 (active), H-003 (active),
  H-004 (closed in session 1), H-005 (superseded by H-006),
  H-006 (active until next deploy lands)
- **Open**: Open-005 (closed in session 3), Open-006 (active),
  Open-007 (active), Open-008 (active)

Session 5 continues at D-011, O-011, L-007, H-007, Open-009 if new
items emerge.
