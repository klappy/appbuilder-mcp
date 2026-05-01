---
uri: klappy://canon/governance/headless-operations
title: "AppBuilder Headless Operations — Knowledge Base for AI Agents"
audience: agent
exposure: nav
voice: instructional
stability: working
tags: ["appbuilder", "scripture-app-builder", "sab", "headless", "mcp", "agent-kb", "operations", "v1-aligned", "non-canonical", "governance"]
epoch: E0008
date: 2026-05-01
derives_from: "klappy://canon/governance/headless-operations (ptxprint-mcp; structural mirror), canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/payload-construction.md, canon/articles/bundled-debug-keystore.md, canon/articles/keystore-reuse.md, canon/articles/apk-installation.md"
governs: "the operational layer between the v1 spec and the AI agent driving Scripture App Builder builds via MCP — what the agent must know to construct payloads, drive builds, and recover from failures without GUI assumptions"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md"
canonical_status: non_canonical
intended_consumer: "AI agent submitting jobs to the appbuilder-mcp server, or AI assistant guiding a user through MCP-mediated APK builds conversationally"
status: working
---

# AppBuilder Headless Operations — Knowledge Base for AI Agents

> **What this KB is.** Operational knowledge for an AI working with
> `klappy/appbuilder-mcp` — building Android APKs from Scripture App
> Builder (SAB) via the MCP server, not the SAB GUI. Two audiences
> share it: (1) an autonomous agent that submits jobs to the MCP server
> to produce signed APKs, and (2) an AI assistant guiding a human user
> conversationally through MCP-mediated app construction. Both touch
> the same surface; both need the same knowledge.

> **What this KB is not.** Not the MCP server's API specification (that
> lives in `klappy://canon/specs/appbuilder-mcp-v1-spec`). Not the
> upstream SAB CLI reference (that lives in
> `klappy://canon/articles/cli-reference`). Not the operator deploy
> recipe (that lives in `DEPLOY.md`). This document is the operational
> layer between the spec and the user, structured as Parts 0–12 +
> Provenance per the original `ptxprint-mcp` headless-operations shape.

> **Containment.** Non-canonical. Where this disagrees with the running
> SAB binary, the binary wins. Where this disagrees with canon, canon
> wins. Where this disagrees with the v1 spec, the spec wins. Verify
> SAB CLI flag names against the running binary before encoding into
> production code.

---

## Part 0 — Identity and Containment

This document is governance, not authority. The authority chain is:

1. The running SAB binary at the version the container image pins.
2. The v1 MCP spec (`canon/specs/appbuilder-mcp-v1-spec.md`).
3. Canon articles under `canon/articles/`.
4. This KB.

Containment rules:

- **Position is forever.** Telemetry blob/double positions are pinned
  in `src/telemetry-schema.ts`. Operational claims here that depend on
  positional behavior must be verified against that module first.
- **Privacy floor is non-negotiable.** App identity (name, package),
  bible source URLs, keystore secrets, and build payload contents are
  never logged. See `canon/governance/telemetry-governance.md`.
- **The agent does not host files.** Bible zips, icons, keystores all
  live at HTTPS URLs the agent already controls. The MCP server only
  ingests URL + sha256.

---

## Part 1 — Architecture Context

The appbuilder-mcp server is a stateless content-addressed APK builder.
The agent does not edit files inside a sandboxed project tree on the
server — it constructs a single JSON payload describing one build job.
The payload is submitted to the server, which dispatches it to an
ephemeral Container running the SAB toolchain (Android SDK + JDK +
Gradle + the `scripture-app-builder` CLI). The Container fetches the
caller-supplied URLs, verifies sha256 as bytes arrive, runs the SAB
CLI, signs the resulting APK, and uploads it to R2.

The agent receives a `job_id` synchronously and polls
`get_job_status` for state transitions:

```
queued → running → succeeded | failed-soft | failed-hard | cancelled
```

Iteration is **payload re-submission**, not file editing. The output
is content-addressed by sha256 of the JCS-canonicalized payload, so a
byte-identical re-submission returns the cached APK URL for free.

---

## Part 2 — Payload Construction

The full payload schema is defined in
[`klappy://canon/articles/payload-construction`](klappy://canon/articles/payload-construction).
Minimum viable payload:

```json
{
  "schema_version": "1.0",
  "name": "<App display name>",
  "package": "<reverse-DNS package id, e.g. org.example.scripture>",
  "bible_source": {
    "kind": "usfm_zip",
    "url": "https://<host>/eng-web_usfm.zip",
    "sha256": "<64-char hex digest of the zip>"
  }
}
```

That's it — `submit_build` accepts this and produces a debug-signed
APK. Everything else (icons, about file, keystore, modern PWA flag)
is optional. The agent layers in optional blocks as the user's intent
becomes specific.

---

## Part 3 — Bible Sources

`bible_source.kind` selects the SAB ingestion path:

| Kind | Source format | When to use |
|---|---|---|
| `usfm_zip` | ZIP of `.SFM`/`.usfm` files (Paratext-style) | The user has Paratext or any USFM bundle |
| `usx_zip` | ZIP of `.usx` files | The user has DBL or USX exports |
| `burrito_zip` | Scripture Burrito v1 bundle | The user has a Burrito-shape bundle |

All three resolve to the SAB CLI `-b <archive>` invocation. The
container auto-detects the inner shape; the `kind` is a hint for
routing, not a hard schema constraint. Burrito support is gated on
the container image pinning the staging branch
`ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`
(landed in v1.1; see `canon/handoffs/burrito-tag-handoff.md`).

`sha256` is verified as bytes arrive. Mismatches produce an immediate
`failure_mode: hard` with the calculated vs declared digests in
`log_tail`.

---

## Part 4 — Icons and Branding

Icons are an optional array. Each entry is `{filename, url, sha256}`.
Filename is the Android resource path (e.g.
`mipmap-mdpi/ic_launcher.png`); the container rewrites it under
`res/`. Recommended sizes: 48×48, 72×72, 96×96, 144×144, 192×192 PNG.

If `icons` is absent, SAB falls back to its bundled default icon —
fine for debug builds, almost certainly wrong for production.

The `about_url` / `about_sha256` pair points to the Markdown content
shown on the in-app About screen. If absent, SAB renders a default
about page.

Neither icons nor about URLs are logged. The privacy floor treats
branding URLs as content.

---

## Part 5 — Keystore Handling

Two modes:

**Debug (default):** the container ships with a bundled debug keystore
documented in
[`klappy://canon/articles/bundled-debug-keystore`](klappy://canon/articles/bundled-debug-keystore).
The agent omits the `keystore` block; SAB signs with the bundled
debug key. Result: APK installs on any Android device that allows
unknown sources. **Not Play Store-eligible.**

**Production:** the agent supplies a `keystore` block:

```json
"keystore": {
  "keystore_url":     "https://<host>/<app>.jks",
  "keystore_sha256":  "<64-char hex>",
  "info_url":         "https://<host>/<app>.info.json",
  "info_sha256":      "<64-char hex>"
}
```

The info JSON carries `keystore_alias`, `keystore_password`, and
`key_password`. The keystore JKS is the standard Java keystore format.
See [`klappy://canon/articles/keystore-reuse`](klappy://canon/articles/keystore-reuse)
for the reuse pattern across app updates.

**Operator hygiene** (mirrors `DEPLOY.md` §6.3):

- Never put keystore passwords in tool calls or chat logs.
- Once an APK ships signed with a key, future updates **must** use the
  same key — keystore loss is unrecoverable.
- The MCP server does not host keystores; the agent's host
  (R2 presigned URL, GitHub release, the agent's own object storage)
  is the keystore origin.

---

## Part 6 — ABI Selection

By default SAB builds a **universal APK** containing native libraries
for all Android ABIs the upstream image supports. This is the safest
option — the resulting APK installs on any device.

Per-ABI splits are not yet exposed via the MCP payload (v1.0). When
they land, the schema will gain an `abi_filters` array (e.g.
`["arm64-v8a", "armeabi-v7a"]`). Until then, the agent should not
attempt to inject ABI flags via free-form string fields; the schema
is `.strict()` and rejects unknown keys.

---

## Part 7 — Build Lifecycle

State machine documented in `canon/specs/appbuilder-mcp-v1-spec.md`:

```
        submit_build
            │
            ▼
        queued ─────────────────┐
            │ container picks up │ cancel_job
            ▼                    │
         running ────────────────┤
        ┌───┴───┐                │
        ▼       ▼                ▼
   succeeded  failed-*        cancelled
        │       │                │
        ▼       ▼                ▼
       (terminal — no further transitions)
```

`get_job_status` returns the current snapshot. The agent should poll
no faster than the build's natural rhythm:

- During `queued`, poll every 5–10 s; the container takes 30–90 s to
  cold-start.
- During `running`, poll every 15–30 s; a typical full SAB build is
  5–15 minutes wall clock.

The Container honors `BUILD_TIMEOUT_DEFAULT` (1800 s = 30 min). Builds
exceeding this are terminated with `failure_mode: timeout`.

---

## Part 8 — Gradle Cache Implications

The Container's `~/.gradle/caches` is **not** shared across container
instances. Cold-start gradle invocations re-download dependencies; this
is the dominant cost in cold-start build wall-clock time.

`max_instances: 10` (per `wrangler.jsonc`) lets up to 10 concurrent
builds run; CF Containers bills running-instance-seconds, not
provisioned ceiling, so a higher max costs nothing while idle.
`sleepAfter: 60m` keeps a warm instance available for back-to-back
submissions.

A warm instance hits the gradle cache and finishes builds in
2–5 minutes. The first build of the morning, after the warm window
expires, is the worst case.

The agent should **not** assume cache state — every payload must be
self-contained. Caching is an infrastructure-level optimization, not
a correctness contract.

---

## Part 9 — Build Artifact Retrieval

On `failure_mode: success`, `get_job_status` returns:

```json
{
  "state": "succeeded",
  "failure_mode": "success",
  "apk_r2_key": "outputs/<sha256-prefix>/<app>.apk",
  "apk_url": "<worker-url>/r2/outputs/<sha256-prefix>/<app>.apk",
  "log_url": "<worker-url>/r2/outputs/<sha256-prefix>/<app>.log",
  "log_tail": "<last ~256 lines of the SAB build log>"
}
```

The `apk_url` and `log_url` are Worker-proxied R2 reads (Day-1 path).
Day-2 will switch to presigned URLs (see
`canon/specs/appbuilder-mcp-v1-spec.md` §4 for the migration plan).
For now, the agent fetches them through the Worker just like any
other HTTP GET.

`HEAD /r2/<key>` is supported (returns metadata only; cheaper than
`GET`). Useful for cache-hit polling.

R2 lifecycle policy (configured operator-side per `DEPLOY.md` §3) sets
`outputs/` to expire at 90 days. After expiry, the cache returns no
hit; submitting the same payload re-builds. The hash itself never
changes; the predicted URL is stable.

---

## Part 10 — Signing Pipeline

For debug builds, signing is done inline by SAB using the bundled
keystore (see Part 5). For production builds, the container:

1. Downloads `keystore_url` and `info_url`, verifies sha256.
2. Parses `info.json` for alias and passwords.
3. Invokes SAB with `--keystore <local-path>`,
   `--alias <alias>`, `--storepass <storepass>`, `--keypass <keypass>`.
4. SAB delegates to `apksigner` (Android SDK).

The signed APK lands at the same content-addressed R2 path. **The
keystore identity is part of the cache key implicitly:** the
`keystore_url + keystore_sha256` pair is included in the JCS payload
hash, so re-signing with a different key produces a different
`apk_r2_key`. Two payloads that differ only in keystore are two
distinct cache entries.

The agent should NOT attempt to re-sign an APK fetched from R2; the
signing flow is one-shot at build time, not a post-process step.

---

## Part 11 — Failure Modes and Diagnostics

Three failure modes per `klappy://canon/articles/failure-mode-taxonomy`:

| Mode | Meaning | Typical cause | Recovery |
|---|---|---|---|
| `hard` | The build infrastructure failed before SAB ran (or sha256 mismatch, or schema rejection). | Bad URL, network failure, malformed payload, container crash. | Fix the input; resubmit. |
| `soft` | SAB ran but failed in a recognized way. | USFM parse error, keystore password mismatch, missing icon. | Read `log_tail`; fix the specific error; resubmit. |
| `success` | APK produced. | — | Use it. |
| `timeout` | Build exceeded `BUILD_TIMEOUT_DEFAULT`. | First-cold-start large project; Gradle dependency resolution stuck. | Resubmit (warm instance is fast); raise timeout if recurring. |
| `cancelled` | `cancel_job` flagged the DO; container exited at next poll. | User cancelled. | Resubmit if intentional. |

The classifier lives in `container/main.py:classify_failure()` and
uses log-string matching. False positives flow as feedback to refine
the classifier (a v0.x task as failure-log corpora accumulate).

Detailed pattern catalogue (gradle errors, signing failures, manifest
merge issues, ABI mismatches, malformed USFM) lives in
[`klappy://canon/articles/diagnostic-patterns`](klappy://canon/articles/diagnostic-patterns).

---

## Part 12 — Recovery Workflows

**Cache miss but expected hit.** Re-check the canonicalized payload —
even a single key reorder before canonicalization is fine (JCS sorts
keys), but a value drift (different sha256, different icons array
order, etc.) produces a different hash. Use `payloadHash()` from
`src/payload.ts` to compute locally and confirm.

**Soft failure on first build of the morning.** Likely a cold-start
Gradle dependency re-resolve that timed out. Resubmit; the second
attempt usually hits the warm instance.

**Hard failure with empty `log_tail`.** Container died before SAB
emitted output. Check `apk_url` for HEAD 404 (it should be 404 since
no APK was produced); resubmit. If the hard failure repeats, the
upstream SAB image may have shifted — escalate to operator (the image
pin lives in `Dockerfile`).

**Soft failure with `BUILD FAILED` in `log_tail`.** Standard Gradle
error. Read the log; the line above `BUILD FAILED` carries the
specific stack trace.

**Cancellation during run.** The container polls
`/internal/job-cancel-flag` every 5 s; cancellation latency is
≤ 5 s. The DO state transitions to `cancelled`; the partial APK is
not uploaded.

End-to-end recipes (minimum-viable APK, debug-install-and-launch,
adb-logcat smoke) live in
[`klappy://canon/articles/workflow-recipes`](klappy://canon/articles/workflow-recipes).

---

## Provenance

- **Source materials:** `canon/specs/appbuilder-mcp-v1-spec.md`,
  `canon/articles/payload-construction.md`,
  `canon/articles/cli-reference.md`,
  `canon/articles/bundled-debug-keystore.md`,
  `canon/articles/keystore-reuse.md`,
  `canon/articles/apk-installation.md`,
  `wrangler.jsonc`, `src/telemetry-schema.ts`,
  `klappy/ptxprint-mcp/canon/governance/headless-operations.md`
  @ `4271d70` (structural mirror — Parts 0–12 + Provenance shape only;
  no PTXprint-domain content).
- **Generated:** 2026-05-01 by claude-opus-4-7 in the appbuilder-mcp
  build session (parity row P2.12).
- **Updated:** never (initial revision).
- **Human review status:** not reviewed.
- **Recommended next passes:**
  - Cross-check Parts 5 / 10 against the keystore-reuse and
    bundled-debug-keystore canon articles for any drift in flag names.
  - Add an "ABI splits" subsection to Part 6 once the schema lands the
    `abi_filters` array.
  - Resolve the open question about whether `predicted_apk_url` should
    return as a presigned URL Day-2 vs continuing to proxy through the
    Worker indefinitely.

---

## Open gaps

Items not yet covered by any chapter article. Surface to the user
honestly when their request lands here.

1. **Per-ABI APK splits.** v1 schema only ships universal APKs. ABI
   splits are deferred; this KB does not document them yet.
2. **AAB output.** Google Play prefers AAB over APK. v1 builds APK
   only; AAB landing is a v1.x increment.
3. **PWA / IPA.** `build_modern_pwa: true` is the only non-APK output
   v1 supports; IPA is out of scope.
4. **Diglot apps.** SAB supports diglot; the MCP payload doesn't yet
   model the dual-bible-source case.
5. **Modern Play Console asset uploads.** App listing assets
   (screenshots, feature graphic, store description) are out of scope
   for v1 — agent uploads those via the Play Console directly.
6. **Project state persistence.** The agent maintains payload history
   in volatile memory or external storage; the MCP server does not
   provide a per-user state surface.
