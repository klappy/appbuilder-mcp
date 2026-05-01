#!/usr/bin/env python3
"""
appbuilder-mcp quickstart smoke — Python edition.

What this script does, in order:

    1. GET  /health            — confirm the worker is up and report its tool list.
    2. POST /mcp  initialize   — open an MCP session.
    3. POST /mcp  tools/list   — enumerate the tool surface as the server reports it.
    4. POST /mcp  tools/call docs(query="payload construction", depth=1)
                                — exercise the in-repo canon retrieval surface,
                                  with one retry to absorb cold-start timeouts.
    5. (--build only) POST /mcp tools/call submit_build {payload}
                                — submit the minimum payload; poll
                                  get_job_status until terminal; print the APK URL.

Default mode is read-only — it does not submit a build.

Run --build to trigger a real APK build (or a cache hit if the same payload has
been submitted before). The default payload is content-addressed, so once any
agent has run --build successfully, all subsequent --build invocations hit cache
and complete in under a second.

Why this script exists
----------------------

The deployed worker's MCP surface is the authoritative tool list (always ask
the server, never trust a hand-maintained README enumeration), but agents
landing on this repo for the first time still need a single place that
demonstrates the request flow end-to-end. This file is that place.

Common pitfalls
---------------

- The Cloudflare edge rejects the default Python `urllib` User-Agent with HTTP
  403. This script sets a project-specific UA. Keep that practice in any
  scripted clients you write against this server.
- The `docs` tool's first call after a Worker cold-start can time out at the
  upstream-oddkit hop. The retry loop here absorbs that. Subsequent calls in
  the same session are fast.
- Job state can sit at `queued` for a few seconds before the Container
  reports back. The poll loop has a generous timeout.

No third-party dependencies. Standard library only. Python 3.8+.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Optional

DEFAULT_BASE_URL = "https://appbuilder-mcp.klappy.workers.dev"
USER_AGENT = "appbuilder-mcp-quickstart/0.1 (+https://github.com/klappy/appbuilder-mcp)"


# ---------- HTTP helpers ----------


def _request(
    method: str,
    url: str,
    *,
    body: Optional[dict] = None,
    headers: Optional[dict] = None,
    timeout: float = 30.0,
) -> tuple[int, dict[str, str], bytes]:
    h = {"User-Agent": USER_AGENT}
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, _lower_headers(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, _lower_headers(e.headers), e.read() or b""


def _lower_headers(headers: Any) -> dict[str, str]:
    # HTTP headers are case-insensitive (RFC 7230). Normalize keys to lowercase
    # so downstream lookups don't have to enumerate casings.
    if not headers:
        return {}
    return {k.lower(): v for k, v in headers.items()}


def _parse_sse_or_json(body: bytes) -> Any:
    text = body.decode("utf-8", errors="replace").strip()
    if not text:
        return None
    if text.startswith("event:"):
        # Streamable-HTTP MCP returns Server-Sent-Events frames. Pull data: lines.
        for line in text.splitlines():
            if line.startswith("data: "):
                return json.loads(line[6:])
        return None
    return json.loads(text)


# ---------- MCP session ----------


class McpSession:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.endpoint = f"{self.base_url}/mcp"
        self.session_id: Optional[str] = None

    def _post(self, body: dict, *, timeout: float = 30.0) -> Any:
        headers = {"Accept": "application/json, text/event-stream"}
        if self.session_id:
            headers["mcp-session-id"] = self.session_id
        status, resp_headers, raw = _request(
            "POST", self.endpoint, body=body, headers=headers, timeout=timeout
        )
        if status >= 400:
            preview = raw[:300].decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {status} from MCP endpoint: {preview!r}")
        # Capture session id on the initialize response.
        sid = resp_headers.get("mcp-session-id")
        if sid and not self.session_id:
            self.session_id = sid
        return _parse_sse_or_json(raw)

    def initialize(self) -> dict:
        body = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "appbuilder-mcp-quickstart", "version": "0.1"},
            },
        }
        envelope = self._post(body)
        if not envelope or "result" not in envelope:
            raise RuntimeError(f"initialize failed: {envelope!r}")
        # The MCP spec requires sending notifications/initialized after init.
        self._post(
            {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}
        )
        return envelope["result"]

    def tools_list(self) -> list[dict]:
        envelope = self._post(
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
        )
        return envelope["result"]["tools"]

    def tools_call(
        self, name: str, arguments: dict, *, request_id: int = 99, timeout: float = 60.0
    ) -> Any:
        body = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        envelope = self._post(body, timeout=timeout)
        return envelope


# ---------- Step implementations ----------


def step_health(base_url: str) -> dict:
    print(f"[1/4] GET {base_url}/health")
    status, _, raw = _request("GET", f"{base_url.rstrip('/')}/health", timeout=10)
    if status != 200:
        raise RuntimeError(f"/health returned HTTP {status}")
    payload = json.loads(raw.decode("utf-8"))
    print(f"      service={payload.get('service')!r} version={payload.get('version')!r} spec={payload.get('spec')!r}")
    print(f"      tools={payload.get('tools')}")
    return payload


def step_initialize(session: McpSession) -> dict:
    print(f"[2/4] POST {session.endpoint}  (initialize)")
    info = session.initialize()
    server = info.get("serverInfo", {})
    print(f"      session_id={session.session_id}")
    print(f"      server={server.get('name')!r} version={server.get('version')!r}")
    return info


def step_tools_list(session: McpSession) -> list[dict]:
    print(f"[3/4] tools/list")
    tools = session.tools_list()
    print(f"      {len(tools)} tools reported by the deploy:")
    for t in tools:
        desc = (t.get("description") or "").replace("\n", " ")
        if len(desc) > 80:
            desc = desc[:77] + "..."
        print(f"        - {t['name']}: {desc}")
    return tools


def step_docs_probe(session: McpSession) -> None:
    """Call docs() with one retry to absorb cold-start timeouts.

    The deployed worker surfaces docs-upstream timeouts in two distinct ways
    and the retry needs to fire on either:

      a) In-payload error — the canonical case, observed in practice. The
         tool returns 200 OK with `result.content[0].text` containing JSON
         like `{"error": "MCP error -32001: Request timed out", ...}`.
      b) JSON-RPC envelope error — defensive case. The server could (per
         spec) return `{"error": {"code": -32001, "message": "..."}}` at
         the envelope level, with no `result` key. Indexing into
         `envelope["result"]` raises KeyError before the retry check runs.

    Bugbot caught (b) on PR #18; this handler addresses both.
    """
    query = "payload construction"
    print(f"[4/4] tools/call docs(query={query!r}, depth=1)")
    last_err: Optional[str] = None
    for attempt in (1, 2):
        try:
            envelope = session.tools_call(
                "docs",
                {"query": query, "depth": 1},
                request_id=10 + attempt,
                timeout=45.0,
            )
        except Exception as e:
            # transport-level failure (HTTP error, connection drop, etc.)
            err_str = str(e)
            if "timed out" in err_str.lower() and attempt == 1:
                last_err = err_str
                print(f"      cold-start transport timeout on first call ({err_str!r}); retrying once...")
                time.sleep(2)
                continue
            raise

        # Envelope-level JSON-RPC error: {"error": {"code": ..., "message": ...}}
        env_err = envelope.get("error") if isinstance(envelope, dict) else None
        if env_err:
            msg = env_err.get("message", "") if isinstance(env_err, dict) else str(env_err)
            if "timed out" in msg.lower() and attempt == 1:
                last_err = msg
                print(f"      cold-start envelope error on first call ({msg!r}); retrying once...")
                time.sleep(2)
                continue
            raise RuntimeError(f"docs tool returned JSON-RPC error: {env_err}")

        if not isinstance(envelope, dict) or "result" not in envelope:
            raise RuntimeError(f"docs tool returned unexpected envelope: {envelope!r}")

        # In-payload error: result.content[0].text contains JSON with "error".
        text = envelope["result"]["content"][0]["text"]
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = {"answer": text, "error": None}
        err = payload.get("error")
        if err and "timed out" in err.lower() and attempt == 1:
            last_err = err
            print(f"      cold-start in-payload timeout on first call ({err!r}); retrying once...")
            time.sleep(2)
            continue
        if err:
            print(f"      docs returned error: {err!r}")
            print(f"      governance_source={payload.get('governance_source')}")
            raise RuntimeError(f"docs tool failed after retry: {err}")
        n_sources = len(payload.get("sources") or [])
        snippet = (payload.get("answer") or "")[:120].replace("\n", " ")
        print(f"      governance_source={payload.get('governance_source')!r}")
        print(f"      sources={n_sources}  answer[0:120]={snippet!r}")
        return
    raise RuntimeError(f"docs tool failed twice; last error: {last_err}")


# ---------- Build flow (--build only) ----------


_TERMINAL_STATES = {"succeeded", "failed", "cancelled"}
_TERMINAL_FAILURE_MODES = {"success", "soft", "hard"}


def _is_terminal(state_payload: dict) -> bool:
    """A job is terminal if either signal has fired.

    The worker writes two independent terminal signals into JobStateDO:
      - `state` ∈ {succeeded, failed, cancelled}
      - `failure_mode` ∈ {success, soft, hard}

    On the failed path, both flip together. On the success path the worker
    has been observed to leave `state="running"` while `failure_mode="success"`
    and `apk_url` are populated (a state-machine race between the worker's
    submit handler and the container's callback). Until that bug is fixed
    server-side, accept either signal as terminal here so the smoke doesn't
    hang on a successful build.
    """
    state = (state_payload.get("state") or "").lower()
    fmode = (state_payload.get("failure_mode") or "").lower()
    return state in _TERMINAL_STATES or fmode in _TERMINAL_FAILURE_MODES


def step_build(session: McpSession, payload_path: str, poll_seconds: int) -> int:
    with open(payload_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    print(f"\n[BUILD 1/3] tools/call submit_build (payload from {payload_path})")
    envelope = session.tools_call(
        "submit_build", {"payload": payload}, request_id=20, timeout=60.0
    )
    text = envelope["result"]["content"][0]["text"]
    submit = json.loads(text)
    if "error" in submit:
        print(f"            submit_build returned error: {submit['error']!r}")
        return 2
    job_id = submit["job_id"]
    cached = submit.get("cached", False)
    print(f"            job_id={job_id}")
    print(f"            cached={cached}")
    print(f"            predicted_apk_url={submit.get('predicted_apk_url')}")
    if cached:
        print("            (cache hit — no Container run; APK already in R2)")
        return 0

    print(f"\n[BUILD 2/3] polling get_job_status every 5s (timeout {poll_seconds}s)")
    deadline = time.time() + poll_seconds
    last_signature: Optional[tuple[Optional[str], Optional[str]]] = None
    while time.time() < deadline:
        envelope = session.tools_call(
            "get_job_status", {"job_id": job_id}, request_id=21, timeout=30.0
        )
        state_payload = json.loads(envelope["result"]["content"][0]["text"])
        state = (state_payload.get("state") or "").lower()
        fmode = (state_payload.get("failure_mode") or "").lower()
        signature = (state, fmode)
        if signature != last_signature:
            print(f"            state={state}  failure_mode={fmode}  progress={state_payload.get('progress')}")
            last_signature = signature
        if _is_terminal(state_payload):
            print(f"\n[BUILD 3/3] terminal state={state}  failure_mode={fmode}")
            print(f"            apk_url={state_payload.get('apk_url')}")
            print(f"            log_url={state_payload.get('log_url')}")
            errors = state_payload.get("errors") or []
            if errors:
                print(f"            errors:")
                for e in errors[:5]:
                    print(f"              - {e}")
            # Success is signalled by failure_mode == "success" OR state == "succeeded".
            # On the worker's success path, state may stay at "running" while
            # failure_mode == "success" and apk_url is populated; treat that as
            # a successful build.
            if fmode == "success" or state == "succeeded":
                return 0
            if fmode in {"hard", "soft"} or state == "failed":
                return 1
            # state == "cancelled" or any other terminal-but-not-success outcome
            return 1
        time.sleep(5)
    sig = f"{last_signature[0] or ''}|{last_signature[1] or ''}" if last_signature else ""
    print(f"            timed out (last signature: {sig}) after {poll_seconds}s")
    print(f"            job_id={job_id} — re-poll later with get_job_status if you want to keep waiting")
    return 3


# ---------- Entry point ----------


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(
        description="End-to-end smoke for the deployed appbuilder-mcp worker.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Worker base URL (default: {DEFAULT_BASE_URL})",
    )
    p.add_argument(
        "--build",
        action="store_true",
        help="Also call submit_build with smoke/full-payload.json and poll until terminal.",
    )
    p.add_argument(
        "--payload",
        default=None,
        help=(
            "Path to a payload JSON file. Default: smoke/full-payload.json "
            "next to this script (smallest known-buildable payload). Use "
            "smoke/minimum-payload.json to exercise the schema floor; note "
            "that payload deliberately omits icons + about and SAB will "
            "reject it as a hard failure."
        ),
    )
    p.add_argument(
        "--poll-seconds",
        type=int,
        default=600,
        help="Maximum total seconds to poll get_job_status (default: 600).",
    )
    args = p.parse_args(argv)

    print(f"appbuilder-mcp quickstart  →  {args.base_url}")
    print("--- read-only probe ---")
    step_health(args.base_url)
    session = McpSession(args.base_url)
    step_initialize(session)
    step_tools_list(session)
    step_docs_probe(session)
    print("--- read-only probe complete ---")

    if not args.build:
        print("\nNot submitting a build (default). Re-run with --build to trigger submit_build.")
        return 0

    import os.path

    payload_path = args.payload or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "full-payload.json"
    )
    return step_build(session, payload_path, args.poll_seconds)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
