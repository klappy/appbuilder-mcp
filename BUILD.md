# Deployment & Operations

> Practical notes for building, deploying, and keeping appbuilder-mcp
> healthy. Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md) and
> [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md).

## Prerequisites

- Node.js ≥ 20
- `wrangler` CLI (installed as a devDep — `npx wrangler ...` works after `npm install`)
- A Cloudflare account with:
  - Workers paid plan (Containers are a paid feature)
  - R2 bucket creation rights (the bucket `appbuilder-outputs` will be auto-provisioned at first deploy via `wrangler.jsonc`)
  - Analytics Engine enabled (the `appbuilder_telemetry` dataset will be auto-created on first write)
- Docker (for local Container builds and image inspection)

## First-time setup

```bash
git clone https://github.com/klappy/appbuilder-mcp.git
cd appbuilder-mcp
npm install
npx wrangler login
```

Set required secrets:

```bash
npx wrangler secret put CF_ACCOUNT_ID
# paste your Cloudflare account ID

npx wrangler secret put CF_API_TOKEN
# paste a read-only Analytics Engine query token
# scopes: Account → Account Analytics:Read

# optional — comma-separated allowlist for the telemetry leaderboard
npx wrangler secret put TELEMETRY_VERIFIED_CLIENTS
```

If you want a custom `WORKER_URL` (default is `appbuilder-mcp.klappy.workers.dev`), edit `wrangler.jsonc` before deploying.

## Deploy

```bash
npx wrangler deploy
```

This builds the Container image from `./Dockerfile`, uploads it to Cloudflare's container registry, and ships the Worker. First deploy can take 5–15 minutes because the SIL `app-builders` base image is large; subsequent deploys reuse layers.

## Verify

```bash
curl https://appbuilder-mcp.<your-account>.workers.dev/health
```

Expect:

```json
{
  "ok": true,
  "service": "appbuilder-mcp",
  "version": "0.1.0",
  "tools": ["submit_build", "get_job_status", "cancel_job", "docs", "telemetry_public", "telemetry_policy"]
}
```

## Smoke build

A canonical first end-to-end build (see [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md) §8 — Definition of Done):

```json
{
  "schema_version": "1.0",
  "name": "Web Bible",
  "package": "org.ebible.web",
  "bible_source": {
    "kind": "usfm_zip",
    "url": "https://<your-host>/eng-web_usfm.zip",
    "sha256": "<64 hex>"
  }
}
```

Submit via your MCP client. Expect:

1. `submit_build` returns a `job_id` and `cached: false`.
2. Poll `get_job_status(job_id)` — state transitions queued → running → succeeded.
3. `apk_url` is populated; `failure_mode = "success"`.
4. Re-submit the same payload byte-identical — `cached: true`, no rebuild.

Encode the validation evidence in a new `canon/encodings/transcript-encoded-session-N.md`.

## Local development

```bash
npx wrangler dev
```

Boots a local Worker against the deployed Container infrastructure (CF Containers do not yet run locally). For full local testing of the Container, build and run the image directly:

```bash
docker build -t appbuilder-mcp:local .
docker run --rm -it -p 8080:8080 appbuilder-mcp:local
# in another terminal:
curl -X POST http://localhost:8080/jobs -H 'content-type: application/json' -d '{...}'
```

Note: the `worker_callback_url` in the test payload must be an address reachable from the running container. For pure CLI smoke testing without callbacks, send `worker_callback_url: null` — state updates and uploads no-op silently (this is the "container appears to do work but nothing lands in R2" failure mode; useful only for testing the SAB invocation itself).

## Type-check and tests

```bash
npm run tsc
npm run test
```

`tsc` runs `--noEmit` so it surfaces type errors without producing dist files.

## Telemetry policy regeneration

When [`canon/governance/telemetry-governance.md`](canon/governance/telemetry-governance.md) changes, regenerate the bundled snapshot used by the `telemetry_policy` fallback:

```bash
npm run bundle-policy
```

This rewrites `src/bundled-policy.ts` from the canon governance file; commit the change with the canon update.

## Operational notes

- **First Android build is slow** (5–15 minutes) because Gradle has no cache. Subsequent builds in the same Container instance (within the 60m sleepAfter window) reuse the Gradle cache and complete much faster.
- **Stuck jobs at state="queued"** usually mean `WORKER_URL` is wrong in `wrangler.jsonc` or unset — the Container's callback URL is null and state updates silently no-op. See `src/index.ts` comments around the `baseUrl` resolution for the failure mode.
- **Container instances are stateless across sleep.** Don't rely on disk persistence across the 60m sleepAfter window; only what's in R2 and Durable Objects survives.

## Upstream image bumps

The Container's `APP_BUILDERS_TAG` ARG defaults to `latest`. To pin a specific upstream tag, edit `Dockerfile`:

```dockerfile
ARG APP_BUILDERS_TAG=<the-pinned-tag>
```

Then redeploy. Bumping the upstream image is a deliberate change — record it in a session encoding.

The burrito-capable upstream tag is the next planned bump. See [`canon/handoffs/burrito-tag-handoff.md`](canon/handoffs/burrito-tag-handoff.md) for the full handoff.

## Cost management

- `max_instances: 2` in `wrangler.jsonc` caps Container spawns. Bump as load demands.
- The `TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR` var (default 60) protects the Analytics Engine 10K-queries-per-day free quota for `telemetry_public`.
- R2 outputs accumulate. Configure a 90-day lifecycle policy in the CF dashboard or via `wrangler r2 bucket lifecycle add` after first deploy.
