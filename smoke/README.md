# `smoke/` — agent-facing quickstart against the live deploy

> The shortest path from "I just found this repo" to "I have called every tool
> the server reports and watched it work end-to-end." Mirrors the pattern in
> [`klappy/ptxprint-mcp`](https://github.com/klappy/ptxprint-mcp/tree/main/smoke).

## What's here

| File | Purpose |
|---|---|
| `quickstart.py` | End-to-end smoke harness in Python (stdlib only, 3.8+). |
| `quickstart.sh` | Same flow in `bash + curl + python3` for shell-flavored callers. |
| `minimum-payload.json` | The smallest valid `submit_build` payload — `name`, `package`, and a real `bible_source` URL with verified `sha256`. |
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

5. `tools/call submit_build` with the JSON in `smoke/minimum-payload.json`.
6. `tools/call get_job_status` polled every 5 seconds (default 600s timeout) until the job reaches `succeeded`, `failed`, or `cancelled`.
7. Print the terminal `apk_url` and `log_url` (Worker-proxied R2 reads).

The submitted payload is content-addressed by `sha256(canonical_payload)`. The first agent who runs `--build` triggers a real Container run on the maintainer's worker (cold-cache Android builds are minutes, not seconds). Every subsequent identical `--build` invocation is a cache hit and returns in under a second. **Re-running an unchanged build is free** — that's the architectural property the server is designed around.

If you want to verify against your own deploy, override the base URL:

```bash
python3 smoke/quickstart.py --base-url https://your-worker.example.workers.dev --build
```

## What `minimum-payload.json` references

```json
{
  "schema_version": "1.0",
  "name": "Web Bible (Smoke)",
  "package": "org.klappy.appbuilder.smoke",
  "bible_source": {
    "kind": "usfm_zip",
    "url": "https://raw.githubusercontent.com/klappy/appbuilder-mcp/main/fixtures/h009/eng-web_usfm_with_booknames.zip",
    "sha256": "386e0051dab7239fc5a59400948019a64f0038b3af3d40bb1ace3a73049b829c"
  }
}
```

The bible source is the H-009 fixture — a perturbed copy of the SIL eng-web USFM priming bundle with a synthesized `BookNames.xml` at the zip root. See [`fixtures/h009/README.md`](../fixtures/h009/README.md) for provenance, sha256, and the H-009 hypothesis it was built to test.

This payload is the candidate for the H-002 end-to-end smoke milestone listed in the top-level [`README.md`](../README.md). At time of writing the milestone has not been confirmed `failure_mode: "success"` end-to-end; running `--build` for the first time is itself the milestone exit criterion. If it returns `failure_mode: "soft"` or `"hard"`, see [`canon/articles/failure-mode-taxonomy.md`](../canon/articles/failure-mode-taxonomy.md) for what each mode means and how to drill into it.

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
