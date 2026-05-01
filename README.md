# appbuilder-mcp

> Scripture App Builder MCP server — stateless, content-addressed APK
> building on Cloudflare Workers + Containers. Modeled on
> [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: v0.1 deployed](https://img.shields.io/badge/status-v0.1%20deployed-green.svg)]()
[![Spec: v1.3-draft](https://img.shields.io/badge/spec-v1.3--draft-blueviolet.svg)](canon/specs/appbuilder-mcp-v1-spec.md)

**Live deploy:** `https://appbuilder-mcp.klappy.workers.dev`
&nbsp;·&nbsp; `/health` returns `{ ok, service, version, spec, tools }`
&nbsp;·&nbsp; `/mcp` accepts Streamable-HTTP MCP
&nbsp;·&nbsp; `/sse` accepts legacy SSE.

The current tool surface is whatever the deploy reports; ask the server (`/health` for a summary, MCP `tools/list` for the full schema) rather than trusting any hand-maintained list. README enumerations drift; the deploy is authoritative.

```
Agent (Claude Desktop / BT Servant / etc.)
  │
  │ MCP/HTTP — 6 tools
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Worker          (the only Worker)            │
│  • submit_build(payload)   → job_id (or cached APK URL) │
│  • get_job_status(job_id)  → state, progress, urls      │
│  • cancel_job(job_id)      → set DO flag                │
│  • docs(query, ...)        → in-repo canon (oddkit)     │
│  • telemetry_public(sql)   → Analytics Engine query     │
│  • telemetry_policy()      → governance from canon      │
└─────────────────────────────────────────────────────────┘
  │
  │ Service binding · ctx.waitUntil(fetch(...))
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Container       (the only Container image)   │
│  Base: ghcr.io/sillsdev/appbuilder-agent-stg            │
│        :feature-scripture-burrito                       │
│  Stack: scripture-app-builder + Android SDK + JDK +     │
│         Gradle + Python FastAPI handler                 │
│  Per job:                                               │
│   1. Materialize bible/icons/about/keystore in scratch  │
│   2. Verify sha256 as bytes arrive                      │
│   3. Run scripture-app-builder -new ... -fp build=...   │
│   4. Classify exit (hard/soft/success)                  │
│   5. Upload APK + log to R2 via Worker                  │
│   6. Update DO with state, URLs, log_tail               │
└─────────────────────────────────────────────────────────┘
  │                                    │
  │ DO state R/W                       │ R2 PUT
  ▼                                    ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│ Durable Objects      │    │ Cloudflare R2               │
│ (one DO per job_id)  │    │  outputs/<hash>/...         │
│                      │    │  (content-addressed APK     │
│                      │    │   + log; long retention)    │
└──────────────────────┘    └─────────────────────────────┘
```

## What it does

Wraps Scripture App Builder (SAB) — the SIL command-line tool that turns
USFM/USX scripture content into Android APKs — behind an MCP surface so
agents can build APKs without knowing about the Android SDK, JDK, Gradle,
or signing.

A minimum payload of `{name, package, bible_source}` produces a runnable
debug-signed APK. Caller-supplied keystores override for production
builds.

## What ships in v0.1

- **SAB only.** RAB / DAB / KAB are out of scope; the upstream image
  bundles them and v1.x can expose them.
- **APK only.** AAB / IPA / PWA are deferred to v1.x.
- **USFM zip, USX zip, and scripture burrito zip input.** Burrito support
  landed in v1.1 by pinning
  `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`; see
  [`canon/handoffs/burrito-tag-handoff.md`](canon/handoffs/burrito-tag-handoff.md) (status: complete).
- **Bundled debug keystore** as the Phase-0 floor; caller can override.
- **Six MCP tools.** Mirror of ptxprint-mcp's surface.

## Quick read order

For agents wiring up against this server:

1. [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md) — what the server does and how.
2. [`canon/articles/payload-construction.md`](canon/articles/payload-construction.md) — how to build a `submit_build` payload.
3. [`canon/articles/cli-reference.md`](canon/articles/cli-reference.md) — the underlying SAB CLI surface.

For maintainers picking up the project:

1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — quick diagram + the five core ideas.
2. [`canon/encodings/transcript-encoded-session-1.md`](canon/encodings/transcript-encoded-session-1.md) — the bootstrap session journal.
3. [`BUILD.md`](BUILD.md) — deployment and operations notes.

## Quickstart for agents

The fastest way from "I just found this repo" to "I have called every tool and watched it work":

```bash
git clone https://github.com/klappy/appbuilder-mcp.git
cd appbuilder-mcp
python3 smoke/quickstart.py            # read-only probe — safe, no build triggered
python3 smoke/quickstart.py --build    # opt-in: submit a real build, poll until terminal
```

The script hits `/health`, opens an MCP session over Streamable-HTTP, lists tools as the **server** reports them, exercises the `docs` tool, and (with `--build`) submits the payload in [`smoke/full-payload.json`](smoke/full-payload.json) — the smallest payload known to produce a successful APK against the deployed SAB image (`name + package + bible_source` is the schema floor, but SAB itself rejects builds without launcher icons and an About file; see [`smoke/README.md`](smoke/README.md) §"Why two payloads"). A bash + curl version lives at [`smoke/quickstart.sh`](smoke/quickstart.sh).

If you are wiring up an MCP-aware agent (Claude Desktop, BT Servant, etc.), point its MCP client at `https://appbuilder-mcp.klappy.workers.dev/mcp` (Streamable-HTTP) or `/sse` (legacy SSE). Then ask the deploy's `docs` tool what it knows:

```text
docs(query="payload construction", depth=2)
docs(query="failure mode taxonomy", depth=2)
docs(query="bundled debug keystore", depth=2)
```

The README does not list every available canon article — that catalog grows over time, and a hand-maintained list would lie in wait. The discovery surface is the tool; the filesystem under [`canon/articles/`](canon/articles/) is authoritative.

## Common pitfalls

These are absorbed by `smoke/quickstart.{py,sh}` but worth knowing if you write your own client:

- **Cloudflare's edge rejects the default `urllib`/`wget` User-Agent with HTTP 403.** Set a project-specific `User-Agent` header on every request.
- **Streamable-HTTP MCP returns SSE frames, not bare JSON.** Bodies look like `event: message\ndata: {...}\n\n`. Strip the `data: ` prefix before parsing.
- **`mcp-session-id` is required on every request after `initialize`.** Capture it from the `initialize` response headers and pass it back as a request header.
- **Don't skip `notifications/initialized`** between `initialize` and the first `tools/call`. The spec requires it.
- **The `docs` tool's first call after a Worker cold-start can time out** with `MCP error -32001: Request timed out` at the upstream-oddkit hop. Retry once after a short pause; subsequent calls in the same session are fast.
- **A job sitting at `state="queued"` for >30s after `submit_build`** likely means the Container hasn't picked it up yet. The Worker writes a "Worker: about to dispatch container.fetch" breadcrumb to JobStateDO before the dispatch — `get_job_status` reflects it. See [`canon/articles/diagnostic-patterns.md`](canon/articles/diagnostic-patterns.md) for the full instrumentation.
- **The schema-floor "minimum" payload is not a buildable payload.** `submit_build` accepts `name + package + bible_source` per the JSON Schema, but SAB v14.0 build 131 (the bundled image) requires launcher icons (72×72 hdpi + 144×144 xxhdpi) and an About file before it will produce an APK. A schema-floor payload returns `failure_mode: "hard"` in ~4 seconds with that explicit error in `log_tail`. Use [`smoke/full-payload.json`](smoke/full-payload.json) as the buildable starting point.
- **`get_job_status` has two terminal signals; on the success path only one fires.** `state` ∈ `{succeeded, failed, cancelled}` and `failure_mode` ∈ `{success, soft, hard}` are independent fields. Failed builds flip both. Successful builds have been observed setting `failure_mode="success"` and populating `apk_url` while `state` stays at `"running"` (a state-machine race between the Worker's submit handler and the Container's terminal callback). Treat either signal as terminal; check `failure_mode` for success — don't wait for `state="succeeded"`.
- **Same payload → same `job_id` (cache hit).** This is by design; the server is content-addressed. Re-submitting an identical payload returns the cached APK URL with no Container run.

## Status

**v0.1 deployed.** Worker, three Durable Object classes, and the burrito-pinned Container image are live at `https://appbuilder-mcp.klappy.workers.dev`. The bootstrap-session journals at [`canon/encodings/`](canon/encodings/) carry the full audit trail. Currently in flight (live tracker: [`docs/parity-matrix.md`](docs/parity-matrix.md), [`docs/work-log.md`](docs/work-log.md)):

- **H-002 / H-006** — first end-to-end smoke build using the eng-web USFM fixture (or H-009 perturbation); observe the burrito-pinned image being pulled (~1.7 GiB single amd64 manifest); confirm `failure_mode: "success"`; resubmit byte-identical to confirm cache hit. Running `smoke/quickstart.py --build` exercises this path.
- **H-003** — telemetry-governance fresh-context review per [`klappy://canon/principles/verification-requires-fresh-context`](https://raw.githubusercontent.com/klappy/klappy.dev/main/canon/principles/verification-requires-fresh-context.md).
- **Open-006/-007/-008** — Container disk-margin observation, `appbuilder-agent-prd:<tag>` promotion, and arm64 manifest watch.

## License

MIT. See [`LICENSE`](LICENSE).

## Upstream / sister projects

- [`sillsdev/app-builders`](https://github.com/sillsdev/app-builders) (`ghcr.io/sillsdev/app-builders`) — the upstream container *carrier* for the four SIL App Builder CLIs (SAB / RAB / DAB / KAB shell scripts and asset files). It is a builder-stage tarball image, not a runtime; it has no shell. Used only via `COPY --from=...` by downstream pipelines.
- [`sillsdev/docker-appbuilder-agent`](https://github.com/sillsdev/docker-appbuilder-agent) — SIL's pipeline that turns the carrier into a runtime: phusion/baseimage + ansible-installed Android SDK + JDK + Gradle + the SAB binaries symlinked into `/usr/local/bin/`. The output is published as `ghcr.io/sillsdev/appbuilder-agent-prd` (production, master branch) and `appbuilder-agent-stg` (staging, develop branch) — **this is the image we layer on** in [`Dockerfile`](Dockerfile).
- [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp) — sister MCP server for PTXprint typesetting; the architectural pattern this server forks. Most canon docs here carry `derives_from:` pointers into ptxprint-mcp.
- [SIL Scripture App Builder](https://software.sil.org/scriptureappbuilder/) — the upstream project's home page and the GUI / "Building Apps" PDF.
