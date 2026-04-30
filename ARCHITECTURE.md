---
title: "AppBuilder MCP — Architecture Overview"
audience: project
exposure: public
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "architecture", "overview"]
canonical_status: non_canonical
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md"
derives_from: "klappy://ARCHITECTURE (ptxprint-mcp — same architecture, AppBuilder-specific deltas)"
---

# Architecture Overview

> Quick orientation. For the full specification, see [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md).

## The system in one diagram

```
Agent (Claude Desktop / BT Servant / etc.)
  │
  │ MCP/HTTP — 6 tools
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Worker          (the only Worker)            │
│  • submit_build(payload)   → job_id (or cached APK URL) │
│  • get_job_status(job_id)  → state, progress, URLs      │
│  • cancel_job(job_id)      → set DO flag                │
│  • docs(query, ...)        → oddkit canon (forwarder)   │
│  • telemetry_public(sql)   → Analytics Engine query     │
│  • telemetry_policy()      → governance from canon      │
└─────────────────────────────────────────────────────────┘
  │
  │ Service binding · ctx.waitUntil(fetch(...))
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Container       (the only Container image)   │
│  Instance: standard-3 (1/2 vCPU, 12 GiB, 20 GB disk)    │
│  sleepAfter: 60m                                        │
│  Base: ghcr.io/sillsdev/app-builders                    │
│  Stack: scripture-app-builder CLI + Android SDK + JDK + │
│         Gradle + fontconfig + Python FastAPI handler    │
│                                                         │
│  Per job:                                               │
│   1. Materialize scratch dir from inline payload        │
│   2. Parallel-fetch bible/icons/about/keystore          │
│      (verify sha256 as bytes arrive)                    │
│   3. Run scripture-app-builder subprocess               │
│   4. Classify exit (hard/soft/success)                  │
│   5. Upload APK + log to R2                             │
│   6. Update DO with state, URLs, log_tail               │
└─────────────────────────────────────────────────────────┘
  │                                    │
  │ DO state R/W                       │ R2 PUT
  ▼                                    ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│ Durable Objects      │    │ Cloudflare R2               │
│ (one DO per job_id)  │    │  • outputs/<hash>/...       │
│                      │    │    (content-addressed APK   │
│                      │    │     + log; long retention)  │
└──────────────────────┘    └─────────────────────────────┘
```

## Core ideas

**Scripture App Builder as a pure function.** The system treats `SAB(name, package, bible, keystore, branding) -> APK` as deterministic. Same inputs → same output. Output is content-addressed by `sha256(canonical_payload)`. Re-submitting an unchanged payload returns the cached R2 URL with no SAB run.

**Stateless workers.** No project tree on the server. Every job is a self-contained submission; the Container materializes a scratch directory at job start, runs, and the disk is wiped on Container sleep. Any Container instance is interchangeable with any other.

**Project state is the agent's responsibility.** The user's bible content, icons, about file, and keystores — wherever those live (local filesystem, Git, DBL, Paratext server) — are accessed by the agent through whatever its environment provides. The build MCP only sees the payload.

**Inline metadata, URL'd binaries.** The payload contains app identity (name, package, build flags) inline. Bible source, icons, about file, and keystore are referenced by URL with sha256 verification. Hosting those URLs is the agent's concern, not the server's.

**Two-step async.** Every build call returns a `job_id` immediately. Status is polled via `get_job_status`. No MCP call blocks for more than a few seconds.

**Three failure modes, not two.** Exit code zero plus an APK is necessary but not sufficient for success — soft failures (degraded APKs from signing issues, missing assets, etc.) are detected by structural checks and surfaced in `get_job_status.failure_mode ∈ {hard, soft, success}`.

## Why Cloudflare

Android builds with cold caches can take minutes; that exceeds Worker CPU budgets but fits cleanly in Cloudflare Containers. R2 is the natural content-addressed output store. Durable Objects provide the per-job state machine. Service bindings let the Worker dispatch to the Container without queue infrastructure.

The whole system is one Worker + one Container image + DO bindings + R2 buckets. No second container, no separate queue worker, no dispatcher service. **One MCP. One image. One repo.**

## Why one repo for code and governance

Drift. A tool surface change requires a governance update; a governance pattern change may shift what the tools should expose. Splitting them across repos creates synchronization burden that compounds. Co-locating them keeps the contract honest — the spec, the code, and the agent-facing operational knowledge all evolve together under one set of commits.

## Differences from ptxprint-mcp

The architectural envelope is identical. The deltas are isolated to:

- **Tool name.** `submit_typeset` → `submit_build`.
- **Artifact type.** PDF → APK.
- **Container base.** PTXprint+XeTeX → SIL app-builders.
- **Bundled asset.** Default cfg → debug keystore.
- **Telemetry slot rebinding** for the existing AE schema (preserves dashboard portability). See `canon/governance/telemetry-governance.md`.
- **Container sizing.** standard-2 (1 vCPU, 6 GiB) → standard-3 (1/2 vCPU, 12 GiB) — Android toolchain is materially heavier than TeX install.

Every other piece — JCS canonicalization, JobStateDO state machine, internal job-update endpoint, the docs proxy, the three-tier telemetry-policy fallback, the Streamable HTTP MCP transport — is structurally identical with namespace renames.

## Where to read next

- [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md) — the full v1 specification
- [`canon/articles/`](canon/articles/) — agent-facing operational knowledge (payload construction, CLI reference, bundled debug keystore, failure-mode taxonomy)
- [`canon/encodings/`](canon/encodings/) — DOLCHEO+H session journals tracking decisions and observations across sessions

For the upstream Scripture App Builder project, see [SIL Scripture App Builder](https://software.sil.org/scriptureappbuilder/) and the [`sillsdev/docker-appbuilder-agent`](https://github.com/sillsdev/docker-appbuilder-agent) reference container.

For the sister MCP server this one is modeled on, see [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp).
