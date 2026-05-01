# `smoke/` — agent-facing quickstart against the live deploy

> The shortest path from "I just found this repo" to "I have called every tool
> the server reports and watched it work end-to-end." Mirrors the pattern in
> [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp/tree/main/smoke).

## What's here

| File | Purpose |
|---|---|
| `quickstart.py` | End-to-end smoke harness in Python (stdlib only, 3.8+). |
| `quickstart.sh` | Same flow in `bash + curl + python3` for shell-flavored callers. |
| `full-payload.json` | The smallest payload that **actually produces an APK** with the deployed SAB image: `name`, `package`, `bible_source`, plus an About file and 72×72 + 144×144 launcher icons. Default for `--build`. |
| `minimum-payload.json` | The schema-floor payload — only `name`, `package`, `bible_source`. Useful for testing payload validation, but the deployed SAB image rejects it as `failure_mode: "hard"` ("Specify an App Icon..." / "Enter some information for the 'About' page..."). See "Why two payloads" below. |
| `README.md` | This file. |

Both `quickstart.{py,sh}` accept the same flags and produce comparable output. Pick whichever fits your environment.

## Default behavior (no flags)

Read-only against the live deploy at `https://appbuilder-mcp.klappy.workers.dev`. In order:

1. `GET /health` — confirm the worker is up and read its self-reported tool list.
2. `POST /mcp` `initialize` — open an MCP session over Streamable-HTTP.
3. `POST /mcp` `tools/list` — enumerate tools as the **server** reports them. Treat this as the source of truth — never trust a hand-maintained README enumeration; deploys drift faster than docs.
4. `POST /mcp` `tools/call docs(query="payload construction", depth=1)` — exercise the in-repo canon retrieval surface. One automatic retry absorbs cold-start timeouts (see "Pitfalls" below).

No build is submitted. No state changes on the worker. Safe to run in CI on every commit.

```bash
python3 smoke/quickstart.py
# or
bash smoke/quickstart.sh
```

Sample output (truncated):

```
appbuilder-mcp quickstart  →  https://appbuilder-mcp.klappy.workers.dev
--- read-only probe ---
[1/4] GET https://appbuilder-mcp.klappy.workers.dev/health
      service='appbuilder-mcp' version='0.1.0' spec='v1.3-draft'
      tools=['submit_build', 'get_job_status', 'cancel_job', 'docs', 'telemetry_public', 'telemetry_policy', 'telemetry_schema']
[2/4] POST https://appbuilder-mcp.klappy.workers.dev/mcp  (initialize)
      session_id=5c1578990e71d9b79e2275...
      server='appbuilder-mcp' version='0.1.0'
[3/4] tools/list
      7 tools reported by the deploy:
        - submit_build: Submit a Scripture App Builder build job. Validates the payload, computes its...
        ...
[4/4] tools/call docs(query='payload construction', depth=1)
      governance_source='knowledge_base'
      sources=2  answer[0:120]="> An agent-facing reference. The schema of record is `src/payload.ts`..."
--- read-only probe complete ---
```

## `--build`: trigger a real build

```bash
python3 smoke/quickstart.py --build
# or
bash smoke/quickstart.sh --build
```

Adds three steps after the read-only probe:

5. `tools/call submit_build` with the JSON in [`full-payload.json`](full-payload.json) (the smallest payload known to produce a successful APK against the deployed SAB image).
6. `tools/call get_job_status` polled every 5 seconds (default 600s timeout) until the job reaches a terminal state — see "Terminal-state detection" below for what counts as terminal and why.
7. Print the terminal `apk_url` and `log_url` (Worker-proxied R2 reads).

The submitted payload is content-addressed by `sha256(canonical_payload)`. The first agent who runs `--build` for a given payload triggers a real Container run on the maintainer's worker (cold-cache Android builds are roughly five minutes; 13 MB APK observed on first run of `full-payload.json`). Every subsequent identical `--build` invocation is a cache hit and returns in under a second. **Re-running an unchanged build is free** — that's the architectural property the server is designed around.

If you want to verify against your own deploy, override the base URL:

```bash
python3 smoke/quickstart.py --base-url https://your-worker.example.workers.dev --build
# or use a different payload:
python3 smoke/quickstart.py --build --payload smoke/minimum-payload.json
```

## Why two payloads

`canon/articles/payload-construction.md` documents the schema-floor minimum as `name + package + bible_source` — and that **is** the floor the MCP `submit_build` tool will accept at the validator. But the Container that runs SAB downstream of that validator has its own requirements that aren't expressed in the JSON schema. As of SAB v14.0 build 131 (the bundled image at time of writing), the SAB CLI fails fast with:

```
Before building the app, please do the following:
 - Specify an App Icon in the following sizes: 72x72 (hdpi), 144x144 (xxhdpi)
 - Enter some information for the 'About' page (copyright, contact details, etc.).
```

…unless the payload also supplies `about_url` + `about_sha256` and at least the two required icon sizes. That's why this directory ships **two** payloads:

- **`full-payload.json`** — the smallest payload that gets to `failure_mode: "success"`. Default for `--build`.
- **`minimum-payload.json`** — preserved for testing the validator and for studying what SAB itself complains about when icons + about are missing. Submitting it is harmless: the worker runs SAB, SAB exits 1 in ~4 seconds, the job lands at `failure_mode: "hard"`, and a small log is written to R2. No APK is produced. Useful for confirming the failure-mode-taxonomy article's `hard` description.

Both payloads use the [H-009 fixture](../fixtures/h009/README.md) for `bible_source` (the SIL eng-web USFM bundle perturbed to include a synthesized `BookNames.xml`, which SAB v14.0+ requires for book-collection 1 to populate). The full payload's icons + about come from the [H-010-full fixture](../fixtures/h010-full/README.md). All sha256 values are pinned and verified.

This payload pair is the candidate for the H-002 end-to-end smoke milestone listed in the top-level [`README.md`](../README.md). Running `python3 smoke/quickstart.py --build` against the live deploy was observed in this session producing a successful 13 MB APK in 5m 13s on first run, content-addressed cache hit thereafter.

## Terminal-state detection

`get_job_status` returns two independent terminal signals:

- `state` — `succeeded` | `failed` | `cancelled` (or in-flight: `queued` | `running`)
- `failure_mode` — `success` | `soft` | `hard` (or `null` while in flight)

On the failed path both flip together. **On the success path the worker has been observed to leave `state="running"` while `failure_mode="success"` and `apk_url` is populated** — a state-machine race between the Worker's submit handler and the Container's terminal callback. Until that's fixed server-side, the polling logic here treats either terminal signal as conclusive: if `failure_mode == "success"`, the build succeeded regardless of whether `state` ever transitions to `succeeded`. Without this, `quickstart.py --build` against a successful build would hang for the full `--poll-seconds` timeout.

## Pitfalls these scripts absorb (so you don't hit them blindly)

- **Cloudflare's edge rejects the default `urllib`/`wget` User-Agent with 403.** Both scripts pin `User-Agent: appbuilder-mcp-quickstart/0.1`. Keep this practice in any custom client you write against the deploy.
- **Streamable-HTTP MCP returns SSE frames, not bare JSON.** The body looks like `event: message\ndata: {...}\n\n`. The parsers here strip the `data: ` prefix.
- **`docs` first-call cold-start can time out** at the upstream-oddkit hop with `MCP error -32001: Request timed out`. Both scripts retry once after a 2-second wait. Subsequent calls in the same session are fast.
- **`mcp-session-id` header is set on the `initialize` response** and is required on every subsequent request in the session. The shell version uses `curl -D` to capture it.
- **`notifications/initialized` is required by the spec** after `initialize` and before any `tools/*` call. Don't skip it.

## What this is not

- Not a CI test runner. The repo's unit tests live under `test/`, exercised by `npm test`.
- Not a definition-of-done for parity with `klappy/ptxprint-mcp`. See [`docs/parity-matrix.md`](../docs/parity-matrix.md).
- Not a replacement for the `docs` tool. The script's docs probe is just a connectivity check — for actual canon retrieval, query the deploy's `docs` tool with your real question.
- **Not validation.** Per [`klappy://canon/constraints/release-validation-gate`](https://raw.githubusercontent.com/klappy/klappy.dev/main/canon/constraints/release-validation-gate.md), same-session smoke is not validation. A green `quickstart.py` proves the surface is reachable; a fresh-context reviewer is what closes the release gate.
