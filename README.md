# appbuilder-mcp

> Scripture App Builder MCP server — stateless, content-addressed APK
> building on Cloudflare Workers + Containers. Modeled on
> [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp).

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
│  Base: ghcr.io/sillsdev/app-builders                    │
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
- **USFM zip and USX zip input.** Scripture burrito support arrives once
  the burrito-capable upstream tag is delivered (Container-only swap).
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

## Status

**v0.1 — initial scaffold pushed; not yet deployed; not yet validated
end-to-end.** The bootstrap session journal at
`canon/encodings/transcript-encoded-session-1.md` lists open items
including a clean `tsc` pass, first end-to-end build (H-002), and the
burrito-tag handoff (H-001). Telemetry governance is
`draft_pending_fresh_review` per
`klappy://canon/principles/verification-requires-fresh-context`.

## License

MIT. See [`LICENSE`](LICENSE).

## Upstream / sister projects

- [`sillsdev/app-builders`](https://github.com/sillsdev/app-builders) (`ghcr.io/sillsdev/app-builders`) — the upstream container with the four SIL App Builder CLIs.
- [`sillsdev/docker-appbuilder-agent`](https://github.com/sillsdev/docker-appbuilder-agent) — SIL's AWS CodeBuild wrapper around the upstream image; the SAB CLI surface used here was recovered from this repo's ansible priming command.
- [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp) — sister MCP server for PTXprint typesetting; the architectural pattern this server forks. Most canon docs here carry `derives_from:` pointers into ptxprint-mcp.
- [SIL Scripture App Builder](https://software.sil.org/scriptureappbuilder/) — the upstream project's home page and the GUI / "Building Apps" PDF.
