# DEPLOY.md — Deploying appbuilder-mcp to Cloudflare

> The deploy is `wrangler deploy` against a Cloudflare account. The
> production-grade behavior — telemetry queries, container builds,
> long-retention APK storage, eventually weekly snapshots — depends on a
> small set of secrets, one R2 lifecycle policy, and a post-deploy `/health`
> check. This document is the recipe for getting from a clean Cloudflare
> account to a working `https://appbuilder-mcp.<your-subdomain>.workers.dev`.
> The wiring matches `klappy/ptxprint-mcp` step-for-step — same secrets,
> same lifecycle policy shape, different bucket names.

## Summary — what you need before you deploy

1. A Cloudflare account with **Workers Paid** ($5/mo) — required for
   Durable Objects, Containers, and the Analytics Engine.
2. `wrangler` 4.20+ logged in (`npx wrangler login`).
3. Two secrets set: `CF_API_TOKEN`, `CF_ACCOUNT_ID`.
   (Two more become required as features land:
   `TELEMETRY_VERIFIED_CLIENTS` is optional today,
   `SNAPSHOT_BOOTSTRAP_TOKEN` will be required when the P2 snapshot
   mechanism ships.)
4. R2 bucket `appbuilder-outputs` with a lifecycle rule (configured
   post-first-deploy because the bucket is created lazily).
5. A successful `curl /health` against the deployed Worker URL returning
   `{"ok": true, ...}`.

If any step fails, the rest will silently no-op. That is the failure mode
this document is structured to prevent.

---

## 1. Pre-deploy — Cloudflare account setup

**Workers Paid plan** is required because:

- Durable Objects (this Worker has three classes) are paid-only.
- Cloudflare Containers (the SAB build runtime) is paid-only.
- The Analytics Engine read-API is metered.

Subscribe at <https://dash.cloudflare.com/?account=workers/plans>. The
$5/month base plan covers the free quota tiers used by this Worker;
real-world cost driver is container-instance-seconds while a build runs.

**Account ID** lives at the bottom-right of the Cloudflare dashboard
under any zone, or via:

```bash
npx wrangler whoami
```

Copy the account ID — it goes into `CF_ACCOUNT_ID` below.

---

## 2. Secrets — `wrangler secret put`

Secrets are set via `wrangler secret put NAME` which prompts for the
value. They are **not** committed to source. The full secret list is in
`wrangler.jsonc`'s trailing comment block; this section documents how to
populate each one.

### 2.1 `CF_API_TOKEN` — Analytics Engine read-only token (required)

Used by the `telemetry_public` MCP tool to forward SQL queries to the
Cloudflare Analytics Engine SQL API. **Read-only** — never grant write
or admin scopes here.

Create at <https://dash.cloudflare.com/profile/api-tokens> with the
**Custom Token** template:

| Section | Setting |
|---|---|
| **Permissions** | `Account` → `Account Analytics` → `Read` |
| **Account Resources** | `Include` → `<your account>` |
| **Zone Resources** | (none) |
| **TTL** | up to you; rotate periodically |

Once created:

```bash
npx wrangler secret put CF_API_TOKEN
# (paste token at the prompt)
```

### 2.2 `CF_ACCOUNT_ID` — account identifier (required as a secret today)

Used by `telemetry_public` to construct the AE SQL endpoint URL. The
account ID is not a credential on its own (it is exposed in dashboard
URLs and any `wrangler whoami` transcript), and `klappy/ptxprint-mcp`
treats it as a public `vars.CF_ACCOUNT_ID` value. `appbuilder-mcp`
currently treats it as a secret.

> **Status:** parity row P3.21 — the public-var-vs-secret choice is a
> one-line ADR that has not been resolved here yet. Until that PR lands,
> set it as a secret to keep the Worker functional:

```bash
npx wrangler secret put CF_ACCOUNT_ID
# (paste account ID at the prompt)
```

After P3.21 closes, this section will document either the secret or the
public-var path — not both.

### 2.3 `TELEMETRY_VERIFIED_CLIENTS` — optional consumer allowlist

Optional comma-separated list of consumer labels that should be marked
"verified" in any future surface that distinguishes verified from
self-declared callers. Leaving this unset disables the verified-client
distinction entirely; that is the supported default.

```bash
# Optional. Skip unless you have a specific verified-list to enforce.
npx wrangler secret put TELEMETRY_VERIFIED_CLIENTS
# (paste comma-separated labels — e.g. "claude-desktop,bt-servant")
```

### 2.4 `SNAPSHOT_BOOTSTRAP_TOKEN` — snapshot bootstrap (forthcoming)

Will gate `POST /internal/snapshot/run` once the P2 snapshot mechanism
lands (parity rows P2.8–P2.10). Until then this secret is unused; setting
it has no effect.

```bash
# Defer until P2 snapshot rows close. Set to a long random string when ready.
npx wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN
# (paste a long random string — `openssl rand -hex 32` is fine)
```

### 2.5 List & confirm

```bash
npx wrangler secret list
```

Expected at minimum:

```
- CF_API_TOKEN
- CF_ACCOUNT_ID
```

---

## 3. R2 — lifecycle policy

`wrangler.jsonc` declares the bucket binding `OUTPUTS` →
`appbuilder-outputs`. The bucket itself is created on first deploy;
**lifecycle policy is not declared in `wrangler.jsonc`** and must be
configured separately.

### 3.1 Recommended policy

| Prefix | Action | Lifetime |
|---|---|---|
| `outputs/` | Expire | 90 days |
| `outputs/` | AbortMultipartUpload | 7 days |

90 days matches the Cloudflare Analytics Engine retention window so APK
artifacts don't outlive the telemetry that contextualizes them. Adjust if
your operator requirements differ.

### 3.2 Apply via the dashboard

<https://dash.cloudflare.com/?to=/:account/r2/default/buckets/appbuilder-outputs/lifecycle>

Add a rule, set prefix `outputs/`, expiration `90 days`, abort-multipart
`7 days`, save.

### 3.3 Apply via CLI (preferred for reproducibility)

```bash
npx wrangler r2 bucket lifecycle add appbuilder-outputs \
  --id appbuilder-outputs-90d \
  --prefix outputs/ \
  --expire-days 90 \
  --abort-multipart-days 7
```

(If your `wrangler` build does not yet support `lifecycle add`, fall back
to the dashboard. The two paths produce identical results.)

### 3.4 Verify

```bash
npx wrangler r2 bucket lifecycle list appbuilder-outputs
```

Should show one rule with prefix `outputs/` and `Expire(90d)`.

---

## 4. Deploy

```bash
npm install
npm run tsc            # type-check
npm test               # unit tests
npx wrangler deploy
```

`wrangler deploy` builds the Container image (`./Dockerfile`), uploads
the Worker bundle, applies the Durable Object migrations, registers the
Analytics Engine binding, and prints the deployed URL.

Expect the first deploy to take longer than steady-state — the SAB
container image is large because the upstream
`ghcr.io/sillsdev/appbuilder-agent-stg` is ~1.7 GiB. Subsequent deploys
ship only deltas.

---

## 5. Post-deploy verification

### 5.1 `/health`

```bash
curl https://appbuilder-mcp.<your-subdomain>.workers.dev/health
```

Expected:

```json
{
  "ok": true,
  "service": "appbuilder-mcp",
  "version": "0.1.0",
  "spec": "v1.3-draft",
  "tools": [
    "submit_build",
    "get_job_status",
    "cancel_job",
    "docs",
    "telemetry_public",
    "telemetry_policy",
    "telemetry_schema"
  ]
}
```

The `tools` array is the canonical surface. If any tool is missing,
something failed at registration time — check the Cloudflare dashboard
for runtime errors.

### 5.2 `/diagnostics/schema` (after parity row P1.5 lands)

```bash
curl https://appbuilder-mcp.<your-subdomain>.workers.dev/diagnostics/schema
```

Returns the BLOB/DOUBLE position-to-name mapping as JSON — the same body
the `telemetry_schema` MCP tool returns. Useful sanity check that the
schema module is wired correctly.

### 5.3 `tools/list` over MCP

Connect any MCP client (Claude Desktop, the MCP CLI, etc.) at
`https://appbuilder-mcp.<your-subdomain>.workers.dev/mcp` and issue
`tools/list`. The seven tools above should appear.

---

## 6. Production keystores — a worked example

By default the container signs APKs with a bundled debug keystore (see
`canon/articles/bundled-debug-keystore.md`). For Play Store submission
you need a production keystore. The pattern is:

1. The agent generates / has access to a Java `keystore.jks` and a
   matching info file (alias + passwords).
2. The agent uploads the two files to a host the Worker can fetch
   (any HTTPS URL the agent already controls — examples: a private R2
   bucket with a presigned URL, GitHub releases, the agent's own object
   storage). **The Worker does not host keystores.**
3. The agent computes sha256 of each file and includes the URL + hash in
   the `keystore` block of the `submit_build` payload.
4. The container fetches both files, verifies sha256 as bytes arrive, and
   passes them to SAB.

### 6.1 Worked example

```bash
# Step 1: generate a fresh keystore (one-time, by the operator)
keytool -genkey -v \
  -keystore my-app-prod.jks \
  -alias my-app-key \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass "$(openssl rand -base64 24)"
# Save the storepass + keypass + alias. This is the secret material.

# Step 2: hash the keystore + write the info file
sha256sum my-app-prod.jks
cat > my-app-prod.info.json <<EOF
{
  "keystore_alias": "my-app-key",
  "keystore_password": "<the storepass from step 1>",
  "key_password":      "<the keypass from step 1>"
}
EOF
sha256sum my-app-prod.info.json
```

### 6.2 Reference in the payload

```json
{
  "schema_version": "1.1",
  "name": "My App",
  "package": "org.example.myapp",
  "bible_source": { ... },
  "keystore": {
    "keystore_url":     "https://your-host.example.com/my-app-prod.jks",
    "keystore_sha256":  "<the keystore sha256 from step 1>",
    "info_url":         "https://your-host.example.com/my-app-prod.info.json",
    "info_sha256":      "<the info sha256 from step 1>"
  }
}
```

### 6.3 Operator hygiene

- Rotate the keystore password if anyone except the operator has ever
  seen it. Once an APK ships signed with a key, future updates **must**
  use the same key — keystore loss is unrecoverable.
- Store the keystore in encrypted at-rest storage (e.g. an encrypted R2
  bucket with KMS, or an operator-side password manager).
- Never put keystore passwords in tool calls or chat logs. The Worker
  never logs payload contents (privacy floor — see
  `canon/governance/telemetry-governance.md`), but operator chat
  transcripts may.

---

## 7. Updating the deploy

```bash
git pull
npm install
npm run tsc && npm test
npx wrangler deploy
curl https://appbuilder-mcp.<your-subdomain>.workers.dev/health
```

Same loop as the initial deploy minus the secret + lifecycle setup. The
`/health` curl is the canonical post-deploy check; it never lies.

---

## 8. Rollback

`wrangler deployments list` shows the last several deploys; pick the
known-good one and:

```bash
npx wrangler rollback --version-id <id>
```

Rollback is instantaneous because the bundle is already at the edge.
Durable Object SQLite state and R2 contents persist across rollback;
make sure your rollback target's code is compatible with the data shape
in flight.

---

## 9. References

- [`wrangler.jsonc`](wrangler.jsonc) — bindings, vars, container
  declaration, Analytics Engine dataset.
- [`canon/specs/appbuilder-mcp-v1-spec.md`](canon/specs/appbuilder-mcp-v1-spec.md) — the contract this Worker implements.
- [`canon/governance/telemetry-governance.md`](canon/governance/telemetry-governance.md) — privacy floor, three-tier policy fallback, dataset allowlist.
- [`BUILD.md`](BUILD.md) — building and iterating on the container image
  (Docker, gradle cache, ABI flags). DEPLOY.md is the Worker-side
  recipe; BUILD.md is the container-side recipe.
- [`canon/articles/bundled-debug-keystore.md`](canon/articles/bundled-debug-keystore.md) — the default keystore behavior the production-keystore pattern overrides.
