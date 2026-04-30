---
title: "appbuilder-mcp Server — Transcript Encoding Session 3 (2026-04-30 container FROM-line correction)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "transcript", "dolceho", "session-3", "container", "dockerfile", "from-line", "correction"]
extends: "transcript-encoded-session-2.md"
encoded_at: 2026-04-30T22:05:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/verification-requires-fresh-context
  - klappy://canon/bootstrap/model-operating-contract
  - klappy://canon/values/axioms (Reality Is Sovereign; You Cannot Verify What You Did Not Observe)
companion_artifacts:
  - "Dockerfile (rewritten — FROM ghcr.io/sillsdev/appbuilder-agent-prd, single-stage runtime)"
  - "canon/specs/appbuilder-mcp-v1-spec.md (§5 Image bullet revised; §1 phrasing clarified)"
  - "BUILD.md (Current State — Container image line revised)"
  - "ARCHITECTURE.md (diagram base updated)"
  - "README.md (diagram base + upstream/sister projects section clarified)"
  - "canon/handoffs/burrito-tag-handoff.md (Trigger + What changes section revised)"
  - "canon/articles/cli-reference.md (lead paragraph clarified)"
---

# appbuilder-mcp Server — Transcript Encoding Session 3

> Operator triggered the first real Workers Builds run by configuring the
> CF dashboard GitHub integration. Worker upload + R2 provisioning
> succeeded; container image build failed at the very first `RUN` line
> with `exec: "/bin/sh": stat /bin/sh: no such file or directory`. The
> failure was a session-1 D-002 design error: the bare
> `ghcr.io/sillsdev/app-builders` image is a builder-stage carrier with
> no shell, not a runtime base. This session pivots D-002 to use
> `ghcr.io/sillsdev/appbuilder-agent-prd` (the operator-tested SAB
> runtime), revises the affected canon, and ships the fix.
>
> ID continuity: session 1 used D-001..D-006, O-001..O-005, L-001..L-003,
> C-001..C-006, H-001..H-004; session 2 added D-007, L-004, O-006,
> Open-005. Session 3 continues at D-008, L-005, O-007, Open-006.

---

## D — Decisions

### D-008 — Container base pivots from bare `app-builders` to `appbuilder-agent-prd` (revises session-1 D-002)

The Container's FROM line is changed from
`ghcr.io/sillsdev/app-builders:${APP_BUILDERS_TAG}` to
`ghcr.io/sillsdev/appbuilder-agent-prd:${APP_BUILDERS_TAG}`.
v0.1 default tag remains `latest`; the burrito-capable tag will be
pinned per `klappy://canon/handoffs/burrito-tag-handoff` (the handoff
itself is updated to reference the agent-prd image).

**Trigger.** Workers Builds first deploy attempt
(commit `0340255` push at 2026-04-30 ~21:22) succeeded through Worker
upload, R2 bucket provisioning (`appbuilder-outputs`), and the upstream
image pull (545 MB compressed). It then died on the very first
`RUN apt-get update ...` line:

```
#8 0.059 runc run failed: unable to start container process:
  error during container init:
  exec: "/bin/sh": stat /bin/sh: no such file or directory
```

**Empirical confirmation.** Direct manifest inspection of
`ghcr.io/sillsdev/app-builders:latest` (digest
`sha256:0f7df1a6a180547fef50be7df8bca7eb2993c2a85e8ec9024465d6082a1589b5`)
returned a config blob with:

- `Cmd: null`
- `Entrypoint: null`
- `Env: null`
- `WorkingDir: ""`
- `Labels: null`
- A single layer
- One history entry: `comment: "Imported from -"`

This is a tarball-imported image with no metadata, no shell, no
defaults — a flat carrier of files. The same inspection of
`ghcr.io/sillsdev/appbuilder-agent-prd:latest` (the production output of
`sillsdev/docker-appbuilder-agent`) returned:

- `Cmd: ['/sbin/my_init']` (phusion baseimage init)
- A real PATH (`/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`)
- 11 layers, 1736 MB total
- Recent history showing
  `chmod +x /app-builders/*.sh && ln -s /app-builders/sab.sh /usr/local/bin/scripture-app-builder ...`

**Operator framing.** *(implicit, via supplied build logs)*

**Rationale.**

1. *Reality is sovereign.* The bare image cannot run RUN commands; the
   build error is unavoidable until the FROM changes. There is no
   alternative fix at the bare-image layer.
2. *KISS.* The agent-prd image is the operator-tested SAB runtime. The
   session-1 D-002 rationale ("CodeBuild surface is dead weight") was
   based on a misframe — the "dead weight" (awscli, fastlane-supply,
   ruby) is bytes on disk, not bytes in the execution path. ~100 MB of
   inactive layers on a 1.7 GB image is acceptable in exchange for
   inheriting a working runtime instead of reimplementing the
   `docker-appbuilder-agent` ansible pipeline ourselves.
3. *DRY canon.* If we need the same Android SDK + JDK + Gradle + SAB
   binaries that SIL already packages, we should layer on their image,
   not duplicate the package list.

**Cross-ref.** Reverses session-1 D-002. The handoff
`canon/handoffs/burrito-tag-handoff.md` already updated to reference the
agent-prd image. The Dockerfile, spec §5, BUILD.md, README.md,
ARCHITECTURE.md, and `cli-reference.md` are all updated this session.

---

## O — Observations (closed)

### O-007 — Session-1 Dockerfile failed at the first RUN line in Workers Builds

Workers Builds log (2026-04-30 21:50:08–27 UTC) shows:

- `apt-get install --no-install-recommends -y python3 python3-pip python3-venv ca-certificates`
- Failed with `exec: "/bin/sh": stat /bin/sh: no such file or directory`

The image build never reached our pip-install layer, our keystore
generation, or our `COPY container/main.py`. The failure was first
contact with the bare image.

This is the exact failure mode that the upstream `docker-appbuilder-agent`
Dockerfile *avoids* by using `ghcr.io/sillsdev/app-builders` as a builder
stage and then `FROM phusion/baseimage:jammy-1.0.1` as the runtime. The
information was sitting in plain sight in turn 1 of session 1 (the
upstream Dockerfile we read while gathering context); we read it,
recorded its layout, and then wrote a single-stage FROM against the
builder-stage image anyway.

**Cross-ref.** Build attempt log supplied by operator on 2026-04-30
22:00 UTC; closes the session-1 H-002 deploy attempt as a hard failure
with classifiable cause.

---

### O-008 — Workers Builds GitHub integration is already configured

Counter to session-2 Open-005 (which assumed the operator hadn't yet run
the one-time bootstrap deploy), the build logs prove the integration is
live: the very first push to `main` triggered Workers Builds, which ran
`npm install` and `npx wrangler deploy` automatically.

The pipeline:

- successfully uploaded the Worker bundle (`Worker Startup Time: 39 ms`)
- successfully created the `appbuilder-outputs` R2 bucket
  ("✨ OUTPUTS provisioned 🎉")
- bound all three Durable Objects + the AE dataset
- only then attempted the container image build, which failed

So Open-005's claim that "the one-time `wrangler deploy` not yet run" was
wrong. The Workers Builds integration is the runtime equivalent of that
bootstrap and it has already executed. **Open-005 is closed by
observation, not by completion** — the work it described is being done
by the pipeline, not by the operator separately.

---

## L — Learnings

### L-005 — When the upstream Dockerfile uses `AS builder`, the source image is not a runtime

In session 1 turn 1, this output was captured to chat:

```
FROM --platform=linux/amd64 ghcr.io/sillsdev/app-builders:${BASE_IMAGE_TAG} AS builder

FROM --platform=linux/amd64 phusion/baseimage:jammy-1.0.1
...
COPY --from=builder / /app-builders/
```

The `AS builder` keyword names the prior FROM as a *stage* whose only
purpose is to be COPYed from. The fact that the next FROM line is a
*different image* (phusion/baseimage:jammy-1.0.1) is the explicit
signal that the upstream maintainers do not intend `app-builders` to be
a runtime. Add `COPY --from=builder /` and the role of each image is
unmistakable: the builder image is a tarball quarry; the runtime image
is what runs.

I read that block, summarized it as "container is layered" without
ingesting the implication, and then wrote a single-stage Dockerfile
against the carrier image. The cost was one round-trip of CF Workers
Builds + ~30 minutes of operator attention.

**Pattern recognized.** When reading an upstream Dockerfile, treat
`FROM ... AS <name>` + a downstream `COPY --from=<name>` as a hard
signal that the named stage is *not* a runtime. Before choosing it as
your own FROM base, run the cheapest possible empirical check:

- `docker manifest inspect <image>` (or the registry HTTP API used in
  this session)
- Look for `Cmd`, `Entrypoint`, `Env`, recent `history` entries
- A null-Cmd, null-Entrypoint, single-import-history image is a carrier,
  not a runtime

That check costs seconds. Skipping it cost a Workers Builds round-trip.

**Generalization.** L-001 (session 1) and L-002, L-004 (session 2) all
clustered around "read the sister-repo / upstream-repo more carefully
before re-deriving." L-005 extends that to the binary layer: read the
upstream Dockerfile *as a graph of stages*, not as a list of FROM lines.

**Cross-ref.** Builds on L-001 (read upstream CI before vendor PDFs),
L-002 (sister-repo provenance is high-leverage), L-004 (model-after
applies to the whole tree).

---

### L-006 — Treat "dead weight" as a constraint to validate, not a constraint to assume

D-002's rationale included: *"The CodeBuild surface (awscli,
fastlane-supply, ruby) is dead weight inside Cloudflare Containers."*

That phrasing carried two unstated assumptions:

1. The "dead weight" makes the agent image meaningfully more expensive
   (worth avoiding).
2. The bare image, without that weight, is a viable alternative.

Both turned out to be wrong. The dead weight is ~100 MB on a 1.7 GB
image (~6%); it's bytes that sit on disk and never execute. The bare
image is not a runtime; the alternative isn't "agent-prd minus dead
weight," it's "build a custom runtime ourselves." Neither comparison
was checked at D-002 time.

**Pattern recognized.** When rejecting an option for "dead weight" or
"too heavy," put a number on it before the rejection lands. If you
can't put a number on it, you don't have evidence — you have an
aesthetic. Aesthetics are valid signals during exploration; they should
not survive the planning gate without being converted into measurable
claims.

**Cross-ref.** Reinforces session-1 L-002 generalization: when the
sister repo has already paid the cost of getting a pattern right,
forking with provenance beats fresh derivation. The agent-prd image is
SIL's "we already paid this cost" artifact for the SAB runtime.

---

## H — Handoffs

### H-005 — Next Workers Builds run validates the FROM-line fix

When this commit lands on `main`, Workers Builds will retry the
container image build with the agent-prd FROM line. The expected
outcome:

- `apt-get update` etc. *(none — those steps are removed since the agent
  image already has python3)*
- `pip3 install -r requirements.txt` (fastapi, uvicorn, httpx, pydantic)
- `keytool -genkey ...` for the bundled debug keystore
- `COPY container/main.py`
- Image build success
- Worker + container deploy lands

Failure modes to watch for:

- `pip3` missing — agent image installs `python3-pip`, so this should
  be present, but if pip is shadowed by the system Python, the install
  may need adjustment.
- `keytool` missing — should be present (Android build path needs it),
  but if not we need to install `default-jdk-headless`.
- `--break-system-packages` flag rejected on older Python — harmless
  no-op on Python <3.11; agent image is jammy/3.10 so this is fine.
- Image size exceeding CF Container disk limit — agent image is 1.7 GB
  compressed; standard-3 has 20 GB disk so this is comfortable.

If the build succeeds and `/health` returns 200, this handoff closes and
H-002 (first end-to-end build) becomes the next active handoff —
submission of a smoke payload to the live Worker.

**Carrier doc.** This encoding.

---

### Update — H-002 (first end-to-end build) unblocks once H-005 lands

Once H-005 closes, H-002 becomes:

> Submit a payload of `{name: "Web Bible", package: "org.ebible.web",
> bible_source: {kind: "usfm_zip", url: ..., sha256: ...}}` to
> `https://appbuilder-mcp.klappy.workers.dev/mcp` via JSON-RPC. Verify
> succeeded → APK at `apk_url`. Encode results as session-4.

The fixture URL and sha256 still need to be sourced — `eng-web_usfm.zip`
in `sillsdev/docker-appbuilder-agent`'s `ansible/roles/app-builders/files/`
is the canonical candidate; we can either host it on a permanent URL or
stage it via `/internal/upload` to the freshly-provisioned R2 bucket
under `outputs/fixtures/` (per the convention noted in ptxprint-mcp's
BUILD.md).

---

## Open Items

### Open-006 — Image size + Container instance disk

The agent-prd image is 1.7 GB compressed; extracted is plausibly
4–5 GB. With Gradle cache + scratch space + APK output, a busy Container
instance could plausibly use 8–10 GB of the standard-3's 20 GB disk.
That's headroom for v0.1 but not unbounded; if first-build experience
shows the cache growing aggressively, bumping to a larger instance type
or adding a Gradle-cache prune step may be needed.

**Resolution.** Observe in the first end-to-end build under H-002.
Encode in session-4 if it materializes as a real concern.

---

### Open-005 — RECLASSIFIED

Session-2 Open-005 ("Initial wrangler deploy not yet run") is closed by
O-008: the Workers Builds GitHub integration is already running the
deploy on push. The bootstrap step is not a separate operator action.
Future encodings should not list this as a blocker.

---

## Provenance

Empirical confirmation methodology used in this session — direct ghcr.io
manifest + config-blob inspection — is fast, free, and costs nothing
relative to a Workers Builds round-trip. The `bash_tool` calls in the
session 3 transcript show exactly the curl invocations; future sessions
should reach for this technique before choosing any new FROM base.

Section ordering and frontmatter discipline mirror sessions 1 and 2;
`extends:` points at the immediately-preceding session per the
sister-repo session-encoding convention.
