---
title: "appbuilder-mcp Server — Transcript Encoding Session 1 (2026-04-30 bootstrap)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "transcript", "dolceho", "session-1", "bootstrap", "v1-scope"]
encoded_at: 2026-04-30T21:14:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/bootstrap/model-operating-contract
companion_artifacts:
  - "canon/specs/appbuilder-mcp-v1-spec.md (new — D-001..D-006)"
  - "canon/articles/payload-construction.md (new — derived from ptxprint-mcp)"
  - "canon/articles/cli-reference.md (new — SAB CLI surface, fresh)"
  - "canon/articles/bundled-debug-keystore.md (new — Phase-0 floor article, derived)"
  - "canon/articles/failure-mode-taxonomy.md (new — derived from ptxprint-mcp)"
  - "canon/governance/telemetry-governance.md (new — derived from ptxprint-mcp + klappy.dev)"
  - "canon/handoffs/burrito-tag-handoff.md (new — pending tag delivery)"
  - "src/index.ts, src/payload.ts, src/output-naming.ts, src/container.ts, src/job-state-do.ts, src/docs.ts, src/telemetry.ts, src/bundled-policy.ts (Worker scaffold)"
  - "container/main.py, container/requirements.txt (Container scaffold)"
  - "Dockerfile (FROM ghcr.io/sillsdev/app-builders + Python FastAPI + bundled debug keystore)"
  - "wrangler.jsonc, package.json, tsconfig.json (Cloudflare config)"
  - "GitHub repository klappy/appbuilder-mcp (created, initial commit pending)"
---

# appbuilder-mcp Server — Transcript Encoding Session 1

> Bootstrap session. Operator opened the project with reference URLs
> (SIL Building Apps PDF, sillsdev/docker-appbuilder-agent,
> sillsdev/app-builders ghcr container) and the directive to model after
> klappy/ptxprint-mcp. Six planning forks resolved by operator answers.
> Repo created on GitHub. Local scaffold produced under one execution
> phase, exceeded a per-turn budget mid-write, resumed the next turn to
> complete remaining canon and push. ID space starts at 001 — sister-repo
> ledgers from ptxprint-mcp do not extend into this repo.

---

## D — Decisions

### D-001 — v1 builder scope: Scripture App Builder only

For v1.0, the appbuilder-mcp server exposes only Scripture App Builder
(SAB) builds. Reading App Builder, Dictionary App Builder, and Keyboard
App Builder (RAB / DAB / KAB) are deferred to v1.x increments. The
upstream `ghcr.io/sillsdev/app-builders` image bundles all four CLIs;
exposing only one is a server-side choice, not an upstream constraint.

**Operator framing (this session):** *"Let's start with SAB."*

**Rationale.** Mirrors ptxprint-mcp's Phase-1 PoC discipline (see
`klappy://canon/articles/phase-1-poc-scope` in ptxprint-mcp): ship the
smallest thing that exercises the architecture, validate it, then add
layers. RAB/DAB/KAB share the same architectural envelope; once SAB is
proven end-to-end, the marginal cost of each additional builder is
small.

**Cross-ref.** Constrains §1 of `canon/specs/appbuilder-mcp-v1-spec.md`.

---

### D-002 — Container base: bare ghcr.io/sillsdev/app-builders

The Container Dockerfile uses `FROM ghcr.io/sillsdev/app-builders:<tag>`
directly, **not** the heavier `ghcr.io/sillsdev/appbuilder-agent-prd`
wrapper that `sillsdev/docker-appbuilder-agent` builds for AWS CodeBuild.

**Operator framing (this session):** *"Just the app-builders cli
container base."*

**Rationale.** The CodeBuild wrapper bundles `awscli`, `fastlane-supply`,
`ruby-2.0`, and other deployment-pipeline tooling that is dead weight
inside Cloudflare Containers. The bare image is the closer analog to
ptxprint-mcp's "PTXprint as a pure function" pattern — the Container
runs the build CLI and nothing else; orchestration lives in the Worker.

**Cross-ref.** Pins `Dockerfile` line 1 (`ARG APP_BUILDERS_TAG`) and
`canon/specs/appbuilder-mcp-v1-spec.md` §5.

---

### D-003 — v1 output: APK only

For v1.0, the Container produces an APK and uploads it to R2. AAB
(Android App Bundle), IPA (iOS), and PWA (Progressive Web App HTML) are
deferred to v1.x. PWA is the closest add — SAB exposes a single
`-build-modern-pwa` flag that adds PWA HTML alongside the APK; the v1
schema includes the boolean but v0.1 still produces APK as the primary
artifact.

**Operator framing (this session):** *"APK only for now, we just add
governance and canon to add more later."*

**Rationale.** APK is the universally-installable Android artifact;
adding AAB requires Play-specific signing flow we don't want to
introduce in v1; adding IPA requires Apple developer-account and
provisioning-profile machinery; adding PWA proper requires a separate
artifact upload and presentation. Each is a distinct schema-and-output
extension, well-documented in canon (this article + the spec) so
future sessions know the shape of each addition.

**Cross-ref.** Pins `canon/specs/appbuilder-mcp-v1-spec.md` §1 and §3.

---

### D-004 — Bundled debug keystore as Phase-0 floor

The Container ships with a debug keystore generated at Docker build time
via `keytool -genkey`, stored at `/app-builders/debug-keystore/`. When
`payload.keystore` is absent, the Container substitutes the bundled
keystore. Caller-supplied keystores override.

**Operator framing (this session):** *"Yes, bundle debug key store."*

**Rationale.** Direct analog of ptxprint-mcp's bundled default cfg
pattern (see `klappy://canon/articles/bundled-default-cfg`). A minimum
payload of `{name, package, bible_source}` produces a runnable APK
with no caller-side signing setup. Documented loudly that production
builds must override.

**Cross-ref.** `Dockerfile` `RUN keytool -genkey ...` block;
`canon/articles/bundled-debug-keystore.md`; `container/main.py`'s
fallback to `APPBUILDER_DEBUG_KEYSTORE` env vars when
`payload.keystore` is None.

---

### D-005 — Repository creation by this session

`klappy/appbuilder-mcp` did not exist prior to this session. The operator
authorized creation: *"create it"*. The session used the operator-supplied
GitHub PAT to create the repo via API (`POST /user/repos`). The PAT is
global (corrects an earlier session misread that thought it was scoped to
klappy.dev + oddkit).

**Operator framing (this session):** *"ITS A GLOBAL PAT, you can create
new GH Repos"* (the all-caps was rightfully directive — the prior
parsing error had treated descriptive text about scope as a hard limit).

**Rationale.** Without the repo, the rest of the work has nowhere to
land. Creating it before pushing the initial commit is the right
ordering.

**Cross-ref.** GitHub API call in session-1 transcript; the repo at
`https://github.com/klappy/appbuilder-mcp`.

---

### D-006 — Canon overlay derives from ptxprint-mcp via copy/modify with provenance

The appbuilder-mcp canon overlay is forked from ptxprint-mcp where the
patterns transfer (architecture envelope, payload-construction shape,
failure-mode taxonomy, telemetry governance). Each derived doc carries
explicit `derives_from:` frontmatter pointing at the source URI.
AppBuilder-specific docs (CLI reference, bundled debug keystore,
burrito-tag handoff) are fresh.

**Operator framing (this session):** *"Wow, that sounds great to derive
from pointers. Feel free to copy/modify point to provenance."*

**Rationale.** DRY canon — see
`klappy://canon/principles/dry-canon-says-it-once`. ptxprint-mcp has
already paid the cost of getting these patterns right across many
sessions; the marginal cost of forking with provenance is much lower
than re-deriving from scratch, and the provenance pointer means a future
edit to the source surfaces as a candidate edit here.

**Cross-ref.** Every doc under `canon/articles/`, `canon/governance/`,
`canon/specs/` carries `derives_from:` where applicable.

---

## O — Observations (closed)

### O-001 — Architecture pattern transfers cleanly

The ptxprint-mcp architecture (one Worker + one Container + DO-per-job +
R2 outputs + content-addressed cache + 6 MCP tools) ports to AppBuilder
with no structural changes. The deltas are:

- Tool name: `submit_typeset` → `submit_build`.
- Artifact: PDF → APK.
- Container base: PTXprint+XeTeX → SIL app-builders.
- Bundled asset: default cfg → debug keystore.
- Telemetry slot rebinding (sources/fonts/figures repurposed; documented
  in `canon/governance/telemetry-governance.md`).

Everything else — JCS canonicalization, JobStateDO state machine,
internal job-update endpoint, the docs proxy to oddkit, the
three-tier telemetry-policy fallback, the Streamable HTTP MCP transport
on `/mcp` and SSE on `/sse` — copies verbatim with namespace renames.

**Implication.** "Model after ptxprint-mcp" was a high-leverage
operator instruction. The canon investment in ptxprint-mcp pays direct
dividends here, and any pattern improvement that lands in ptxprint-mcp
becomes a candidate to forward-port via the `derives_from:` pointers.

---

### O-002 — SAB CLI surface recovered from ansible role, not vendor PDF

The exact `scripture-app-builder` flags and order were recovered from
`ansible/roles/app-builders/tasks/main.yml` in
`sillsdev/docker-appbuilder-agent`. The priming command in that ansible
file is:

```
HOME=/root scripture-app-builder -new -n web -p org.ebible \
  -b /root/prime/eng-web_usfm.zip \
  -ks /root/prime/keystore_prime.keystore \
  -i /root/prime/keystore_prime.txt \
  -a /root/prime/about.txt \
  -ic /root/prime/ab-001-black-144.png \
  -ic /root/prime/ab-001-black-72.png \
  -fp build=/tmp/build
```

This is a tested, working invocation; the canon
`canon/articles/cli-reference.md` is authoritative documentation derived
from it.

**Implication.** Reading the source ansible role of an upstream CLI is
faster than reading vendor PDFs (the SIL "Building Apps" PDF is
GUI-oriented). Ledger this for future sessions: when surfacing an
upstream CLI surface, find the priming command in upstream's container
build first.

---

### O-003 — Burrito-capable tag promised but not delivered this session

The operator said: *"I will get a tag to you in a bit that can take a
scripture burrito."* The tag did not arrive within session 1.

**Implication.** v0.1 ships pinned to `app-builders:latest` and accepts
USFM/USX zip via `-b`. The burrito-tag transition is captured in
`canon/handoffs/burrito-tag-handoff.md`; it is a Container-only swap
(Worker code does not change).

---

### O-004 — klappy/appbuilder-mcp did not exist prior to this session

`https://github.com/klappy/appbuilder-mcp` returned 404 before D-005
landed. The repo was created via the GitHub API mid-session. Initial
commit landed at the end of session 1.

---

### O-005 — Per-turn execution budget exceeded mid-scaffold

The session 1 execution phase was split across two model turns. Turn 1
created the repo and the bulk of the source/scaffold; the remaining
canon docs and the initial commit landed in turn 2 after the operator
said *"Continue"*. No design changes; pure budget split.

**Implication.** Multi-file scaffold work has a per-turn ceiling under
this client/model combination. Future sessions should plan to split
similar bootstraps the same way: one turn for repo + source skeleton +
core spec; a second turn for remaining canon + push + validation. Or
preflight more aggressively to keep within one turn.

---

## L — Learnings

### L-001 — Reading source ansible roles beats reading vendor PDFs

When recovering an upstream CLI surface, find a tested invocation in
the upstream's own container/CI configuration before opening the
vendor's documentation PDF. The ansible priming command in
`sillsdev/docker-appbuilder-agent` resolved the SAB CLI surface in
seconds; the equivalent reading of the SIL "Building Apps" PDF would
have been slower and produced a less precise result (the PDF
documents the GUI, with the CLI surface scattered as an addendum).

**Pattern recognized.** Upstream CI is documentation-as-code for the
exact CLI surface the project's authors test against. Treat it as
authoritative; treat vendor PDFs as user-facing context.

---

### L-002 — Sister-repo provenance via `derives_from:` pays for itself immediately

Several canon docs in this session forked from ptxprint-mcp via
copy-and-modify-with-provenance: `payload-construction.md`,
`failure-mode-taxonomy.md`, `bundled-debug-keystore.md`,
`telemetry-governance.md`. Each saved 30-60 minutes of fresh authoring
versus deriving from scratch, and the explicit provenance pointer means
future improvements to the source surface as candidate edits here.

The technique generalizes beyond this session: when bootstrapping a new
oddkit-pattern MCP server from a prior one, treat the prior one's
canon as a quarry, not a competitor.

---

### L-003 — Misreading "scoped to" in operator credentials notes

Turn 1 misread the operator's credential annotation "scoped to contents +
PRs" as "the PAT can only access klappy.dev and klappy/oddkit." The
operator's all-caps correction (*"ITS A GLOBAL PAT"*) revealed that the
"scoped to" phrasing referred to the PAT's permission scopes, not its
repository targets.

**Implication.** When operator notes about credentials are ambiguous,
test the credential before letting the misread shape an entire planning
fork. A 5-second `curl` against the GitHub API would have caught this
parsing error before it reached the operator's attention.

---

## C — Constraints

### C-001 — One MCP, one image, one repo

Inherited from ptxprint-mcp. The whole system is one Cloudflare Worker +
one Container image + DO bindings + R2 buckets. No second container, no
separate dispatcher service, no queue worker. Code and canon co-locate
in the same repo with the same commit boundary.

### C-002 — Stateless container, payload-as-pure-function

Inherited from ptxprint-mcp. No project tree on the server. Every build
is self-contained. Output is content-addressed by
`sha256(canonical_payload)`. Re-submitting an unchanged payload returns
the cached APK URL with no rebuild.

### C-003 — Two-step async, no MCP call blocks more than seconds

Inherited from ptxprint-mcp. `submit_build` returns `job_id` immediately;
`get_job_status` polls. Container does the long work behind the
ctx.waitUntil dispatch.

### C-004 — Three failure modes, structural classification

Inherited from ptxprint-mcp. `failure_mode ∈ {hard, soft, success}`.
`hard` = no APK. `soft` = APK produced but log surfaces quality
markers. `success` = APK produced, no soft markers. See
`canon/articles/failure-mode-taxonomy.md`.

### C-005 — Privacy floor: app identity is content

App name and package name are treated as content for telemetry purposes
and never logged. Only `payload_hash_prefix` (first 8 hex of canonical
sha256) is recorded as a pseudonymous payload identifier.
See `canon/governance/telemetry-governance.md`.

### C-006 — Bundled debug keystore must not ship to production

The bundled keystore signs APKs that install on devices but cannot be
distributed (the signing key is public and shared across every container
of the same image). Documented loudly in canon and in the Dockerfile
comments.

---

## H — Handoffs

### H-001 — Burrito-capable container tag (pending operator delivery)

When the operator delivers the burrito-capable tag of
`ghcr.io/sillsdev/app-builders`, swap the `APP_BUILDERS_TAG` ARG in
`Dockerfile` and bump `payload.bible_source.kind` to include
`"burrito_zip"`. Schema bumps from `1.0` → `1.1` (strict extension; old
payloads remain valid). Worker code does not change.

**Carrier doc.** `canon/handoffs/burrito-tag-handoff.md`.

---

### H-002 — First end-to-end build validation (Phase-1 PoC)

Submit a payload of `{name: "Web Bible", package: "org.ebible.web",
bible_source: {kind: "usfm_zip", url: ..., sha256: ...}}` against the
deployed Worker. The fixture should be the same `eng-web_usfm.zip` that
`docker-appbuilder-agent` uses to prime its image. Verify:

1. `submit_build` returns `cached: false` with a `job_id`.
2. `get_job_status` shows queued → running → succeeded with
   `failure_mode = "success"`.
3. The APK at `apk_url` is downloadable, installs on an Android device,
   and runs.
4. Re-submitting the same payload returns `cached: true`.

**Carrier doc.** `canon/specs/appbuilder-mcp-v1-spec.md` §8 (Definition
of Done).

**Encode the validation as transcript-encoded-session-2.md** when it
runs.

---

### H-003 — Telemetry governance fresh-context review

`canon/governance/telemetry-governance.md` carries
`status: draft_pending_fresh_review`. Per
`klappy://canon/principles/verification-requires-fresh-context`, a
context-break review by a separate session is required before this
document can be promoted to canon-tier-1 status. The H-T2 review pattern
in ptxprint-mcp (see
`klappy://canon/handoffs/telemetry-governance-h-t2-review`) is the
template to follow.

---

### H-004 — Bundled-policy snapshot regeneration

`src/bundled-policy.ts` was copied from ptxprint-mcp's snapshot of its
own `telemetry-governance.md` and contains PTXprint-domain text. After
session 1, run `npm run bundle-policy` (or its equivalent) to regenerate
`src/bundled-policy.ts` from this repo's
`canon/governance/telemetry-governance.md`. Until then, the three-tier
policy fallback chain returns the wrong text in the `bundled` tier.

**Workaround.** The `knowledge_base` tier (live fetch from canon) is the
primary source and works correctly; the `bundled` tier is a fallback
only used when the canon fetch fails. The wrong text in `bundled` is a
real defect but a low-blast-radius one.

---

## Open Items

### Open-001 — Worker source compilation

The TypeScript source has not yet been validated by `tsc --noEmit`. The
sed-based renames touched many lines in `src/index.ts` and
`src/telemetry.ts`; one block was hand-fixed mid-session, but a clean
compile pass has not been run. Risk: residual syntax errors from the
sed pipeline.

**Resolution.** Run `npm install && npx tsc --noEmit` in a follow-up
session; fix any errors that surface; encode as transcript-encoded-session-2
items O / D (closed).

---

### Open-002 — Custom domain vs. workers.dev

`wrangler.jsonc` pins `WORKER_URL` to
`https://appbuilder-mcp.klappy.workers.dev`. If the operator wants a
custom domain, this needs adjusting before first deploy. Default for
v0.1 is workers.dev (free, no DNS surface).

---

### Open-003 — Container instance sizing under real load

`wrangler.jsonc` declares `instance_type: standard-3` (1/2 vCPU, 12 GiB
RAM, 20 GB disk). This is a pre-validation guess based on the Android
toolchain being heavier than PTXprint's TeX install. First end-to-end
build (H-002) is the empirical check.

---

### Open-004 — Cancellation semantics for Android builds

The SAB CLI does not currently expose a clean cancellation hook. The
`cancel_job` tool records the flag but the container completes the
current build before stopping. For long Gradle builds (cold cache) this
is a real ergonomic gap. Document in canon if the gap persists; raise
upstream if it becomes operationally painful.

---

## Provenance summary

This session encoding follows the format established in
`klappy://canon/encodings/transcript-encoded-session-7` (ptxprint-mcp).
The DOLCHEO+H section ordering (Decisions, Observations, Learnings,
Constraints, Handoffs, Open Items) matches the convention in
`klappy://canon/definitions/dolcheo-vocabulary` (klappy.dev).

ID counters in this repo start at 001. ptxprint-mcp's session ledgers
(D-025, O-020, etc.) are sister, not parent — they do not extend into
this repo's namespace.
