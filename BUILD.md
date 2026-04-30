---
title: "AppBuilder MCP — Deployment & Operations"
audience: project
exposure: working
voice: instructional
stability: working
canonical_status: non_canonical
derives_from: "klappy://BUILD (ptxprint-mcp — same Workers Builds GitHub integration pattern)"
---

# Deployment & Operations

> Practical notes for re-deploying, redeploying after changes, and keeping
> the system healthy. Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md) and
> [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md).

## Current state (v0.1)

- **Live deployment:** `https://appbuilder-mcp.klappy.workers.dev` *(R2 bucket and Worker provisioned by Workers Builds 2026-04-30; first container build failed and was fixed in PR/commit pivoting the FROM line — see `canon/encodings/transcript-encoded-session-3.md`. Session 4 then pinned the burrito-capable image — see `canon/encodings/transcript-encoded-session-4.md`.)*
- **Worker version (per `/health`):** `0.1.0`
- **Spec target:** `v1.1-draft`
- **Container image:** built from `./Dockerfile`; layered on `${APP_BUILDERS_IMAGE}` which defaults to `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito` (pinned in session 4 to land scripture burrito input — closes H-001 per [`canon/handoffs/burrito-tag-handoff.md`](canon/handoffs/burrito-tag-handoff.md)). The bare `app-builders` image is a builder-stage carrier and cannot be used as a runtime FROM base. Promotion to a stable `appbuilder-agent-prd:<tag>` is tracked as Open-007 against the upstream feature-branch merge.
- **R2 bucket:** `appbuilder-outputs` (binding `OUTPUTS`)
- **Durable Objects:** `AppbuilderMcp`, `JobStateDO`, `AppbuilderContainer` (single migration `v1`)
- **Container instance:** `standard-3` (1/2 vCPU, 12 GiB memory, 20 GB disk), `max_instances: 2`
- **Analytics Engine dataset:** `appbuilder_telemetry` (binding `APPBUILDER_TELEMETRY`)

## How deploys work

**Pushes to `main` auto-deploy via Cloudflare Workers Builds.** The CF
dashboard is configured with the GitHub integration: each merged commit on
`main` runs `npm install` followed by `npx wrangler deploy`, which
(re)builds and pushes both the Worker and the Container image.

This is *not* a `.github/workflows/` GitHub Actions setup — it's the native
Cloudflare Workers Builds integration, configured in the dashboard. The
absence of a workflow file in the repo does not mean "no CI." Verify a
deploy is live by hitting `/health` and observing the change you expect.

**Do not run `wrangler deploy` manually.** It conflicts with the Workers
Builds pipeline and isn't necessary. The only exception is the one-time
initial deploy from scratch (§"First-time setup" below); after that,
every change goes through `git push`.

## Deploying changes

### Worker code (`src/`), Container (`Dockerfile`, `container/main.py`), or wrangler config

```
git push origin <branch> → open PR → merge to main → Workers Builds runs npx wrangler deploy
```

Verify the deploy landed:

```bash
curl -A "appbuilder-ops/0.1" -w "\nHTTP %{http_code}\n" \
  https://appbuilder-mcp.klappy.workers.dev/health
# Then exercise the specific behavior the change introduced (e.g. for a
# route change, curl the route; for a Container change, submit a smoke
# payload that perturbs the hash so you get a fresh container instance
# pulling the new image).
```

If `/health` doesn't reflect the change after a few minutes, check the
**Workers & Pages → appbuilder-mcp → Deployments** tab in the CF dashboard
for the build status and logs.

The Container DO picks up a new image on its next cold start (it sleeps
after 60m idle by default). To force a fresh container instance after a
Dockerfile change, submit a smoke job with a unique payload (perturb a
`name` suffix or any field to change the canonical hash) — this dispatches
to a new container instance which pulls the new image.

### Canon-only changes (`canon/`, `*.md`)

No deploy effect. Canon is served by `oddkit` MCP at agent runtime, not by
this Worker. Push to main and the next session's `oddkit_search` against
`knowledge_base_url=https://github.com/klappy/appbuilder-mcp` will see the
change (subject to oddkit's own caching).

## First-time setup (re-creating the deployment from scratch)

For a fresh Cloudflare account or a forked deployment, the steps are:

### 1. R2 bucket

```bash
npx wrangler r2 bucket create appbuilder-outputs
```

Set lifecycle policies in the CF dashboard → R2 → bucket → Settings →
Object lifecycle:
- `appbuilder-outputs`: 90-day expiration on prefix `outputs/<hash>/`.

### 2. Wrangler config

Edit `wrangler.jsonc`:
- `vars.WORKER_URL` must match the workers.dev hostname (or your custom
  domain).
- `containers[0].max_instances` and `instance_type` per your CF Containers
  tier.

### 3. Initial deploy

```bash
npm install
npx wrangler deploy
```

The first deploy creates the Durable Object SQLite tables (per the
`migrations` block) and pushes the container image. **This is the only
time you should run `wrangler deploy` manually.** All subsequent deploys
go through Workers Builds (see "How deploys work" above) — set up the
GitHub integration step (§5 below) once and never touch wrangler from the
command line again.

### 4. Secrets

```bash
# Cloudflare account ID (used by telemetry_public to target the AE API)
npx wrangler secret put CF_ACCOUNT_ID

# Read-only Analytics Engine query token
# Token scope: Account → Account Analytics:Read
npx wrangler secret put CF_API_TOKEN

# (Optional) comma-separated allowlist of verified consumer labels for
# the telemetry leaderboard
npx wrangler secret put TELEMETRY_VERIFIED_CLIENTS
```

### 5. WAF / Browser Integrity rules

The CF dashboard's default Browser Integrity Check treats MCP clients
(and `urllib`'s default UA) as bots and 403s them. Before exposing `/mcp`
publicly:

- **Security** → **WAF** → **Custom rules** → add a skip rule:
  - Field: `URI Path` contains `/mcp`
  - Action: **Skip** → Browser Integrity Check, Bot Fight Mode

Or set an explicit `User-Agent` on every client request that goes through
the Worker (e.g. `appbuilder-smoke/0.1`); default `python-urllib/3.x` will
be 1010-banned.

### 6. Workers Builds GitHub integration (the deploy automation)

In the CF dashboard, after the initial `wrangler deploy` lands:

1. **Workers & Pages** → **appbuilder-mcp** → **Settings** → **Builds** →
   **Connect repository** → choose `klappy/appbuilder-mcp`.
2. Build settings:
   - Build branch: `main` (production)
   - Build command: `npm install`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. Wrangler picks up `wrangler.jsonc` automatically. Container image build
   happens during the Workers Builds run.

Once configured, every merged commit on `main` triggers a build-and-deploy.
**No further manual `wrangler deploy` invocations.** Verify by pushing a
small change and watching the Deployments tab.

## Health checks

```bash
# Liveness — fast
curl -A "appbuilder-ops/0.1" -w "\nHTTP %{http_code}\n" \
  https://appbuilder-mcp.klappy.workers.dev/health

# Smoke (Phase 1, end-to-end build)
# Submit a minimum payload via JSON-RPC POST to /mcp using the canonical
# eng-web_usfm.zip fixture (the same one sillsdev/docker-appbuilder-agent
# primes its image with). Expected wall-clock: minutes (cold cache),
# seconds (warm cache).
# Encode the validation evidence in canon/encodings/transcript-encoded-session-N.md.
```

## Local development

```bash
npx wrangler dev
```

Boots a local Worker against the deployed Container infrastructure (CF
Containers do not yet run locally). For full local testing of the
Container, build and run the image directly:

```bash
docker build -t appbuilder-mcp:local .
docker run --rm -it -p 8080:8080 appbuilder-mcp:local
# In another terminal:
curl -X POST http://localhost:8080/jobs \
  -H 'content-type: application/json' \
  -d '{"job_id":"smoke","payload":{...},"payload_hash":"...","apk_r2_key":"...","log_r2_key":"...","worker_callback_url":null}'
```

When `worker_callback_url` is null, state updates and uploads no-op
silently — useful for testing the SAB invocation in isolation; useless for
verifying the full pipeline. For full pipeline verification, use the
deployed Worker.

## Type-check and tests

```bash
npm run tsc       # tsc --noEmit
npm run test      # vitest (test/ dir is empty in v0.1)
```

## Telemetry policy regeneration

When [`canon/governance/telemetry-governance.md`](canon/governance/telemetry-governance.md)
changes, regenerate the bundled snapshot used by the `telemetry_policy`
fallback:

```bash
npm run bundle-policy
```

This rewrites `src/bundled-policy.ts` from the canon governance file. Commit
the change with the canon update so the next push-triggered Workers Build
picks it up.

## What's IN the deployment today (v0.1)

- `submit_build` — full flow: validate, hash, R2 cache check, DO init,
  container dispatch.
- `get_job_status` — DO read with R2 proxy URL augmentation. Honest
  `failure_mode ∈ {hard, soft, success}`.
- `cancel_job` — DO flag set; SAB CLI does not currently support
  mid-build cancellation, so the build runs to completion. Documented
  in the tool description.
- `docs` — oddkit proxy for in-repo canon retrieval.
- `telemetry_public`, `telemetry_policy` — analytics surface and policy
  resolution (three-tier).
- `/internal/upload` — unauthenticated R2 PUT under the `outputs/`
  prefix only.
- `/r2/<key>` — GET and HEAD proxy through the Worker.

## What's NOT in the deployment today (v1.x and later)

- RAB / DAB / KAB builders (v1.x).
- AAB / IPA output (deferred).
- PWA HTML output as a separate artifact (v1.x; the `build_modern_pwa`
  flag exists in the schema but v0.1 still produces APK only).
- Burrito-format input (depends on operator-delivered upstream tag —
  see `canon/handoffs/burrito-tag-handoff.md`).
- Container-side mid-build cancellation.
- Refined soft-failure markers (the v0.1 classifier is deliberately
  narrow — see `canon/articles/failure-mode-taxonomy.md`).

## Operational quirks (don't relearn)

These will accumulate as we observe real builds. v0.1 starts the list with
inherited-from-ptxprint-mcp rules of thumb:

- **Default `urllib` UA gets Cloudflare-1010-banned.** Always set explicit
  `User-Agent` on programmatic requests that go through the Worker.
- **Job IDs are `sha256(canonicalize(payload))`.** Same payload → same id
  → same R2 path → free cache hit. Perturb any field to force fresh DO
  state.
- **`WORKER_URL` must match the deployed hostname** in `wrangler.jsonc`.
  If it's wrong or empty, the Container's callback URL is null, and
  state updates / artifact uploads silently no-op — jobs will appear
  stuck at `state="queued"` forever. The `human_summary` in JobStateDO
  reflects whatever the Worker last wrote, which is the
  initial "queued" string.
- **First Android build is slow** (5–15 minutes, cold Gradle cache).
  Subsequent builds within the 60m sleepAfter window reuse the cache and
  complete much faster.
- **Bundled debug keystore signs APKs that install but cannot be
  redistributed.** The signing key is public and shared across every
  Container of the same image tag. See
  `canon/articles/bundled-debug-keystore.md`.

## Where to read for more depth

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system overview in one diagram
- [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md) — the formal v1 specification
- [`canon/articles/`](canon/articles/) — agent-facing operational knowledge (payload construction, CLI reference, bundled debug keystore, failure-mode taxonomy)
- [`canon/handoffs/`](canon/handoffs/) — durable cross-session records (burrito-tag handoff is the live carrier)
- [`canon/encodings/`](canon/encodings/) — DOLCHEO+H session journals
