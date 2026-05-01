#!/usr/bin/env bash
# appbuilder-mcp quickstart smoke — bash + curl edition.
#
# Mirrors smoke/quickstart.py: hits /health, opens an MCP session over
# Streamable-HTTP, lists tools, exercises the docs tool. Default mode is
# read-only and does not submit a build. Pass --build to also call
# submit_build and poll get_job_status until terminal.
#
# Why this script exists
#   The deployed worker's MCP surface is the authoritative tool list. Agents
#   landing on this repo for the first time still need a single place that
#   demonstrates the request flow end-to-end. This file is that place for
#   shell-flavored callers.
#
# Common pitfalls absorbed by this script
#   - Cloudflare's edge rejects the default curl/wget User-Agent on some
#     paths. We always pass -A.
#   - Streamable-HTTP MCP returns SSE frames, not bare JSON. We strip the
#     "data: " prefix.
#   - The mcp-session-id header is case-insensitive and is set on the
#     initialize response. We capture it from response headers before
#     making any subsequent calls.
#
# Dependencies: bash, curl, python3 (for JSON parsing only — no third-party
# Python packages). Run from any directory.

set -euo pipefail

BASE_URL="${BASE_URL:-https://appbuilder-mcp.klappy.workers.dev}"
USER_AGENT="${USER_AGENT:-appbuilder-mcp-quickstart/0.1 (+https://github.com/klappy/appbuilder-mcp)}"
DO_BUILD=0
PAYLOAD_PATH=""
POLL_SECONDS=600

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) DO_BUILD=1; shift ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --payload) PAYLOAD_PATH="$2"; shift 2 ;;
    --poll-seconds) POLL_SECONDS="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set -euo/{/^set -euo/d;p;}' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_PATH="${PAYLOAD_PATH:-${SCRIPT_DIR}/full-payload.json}"
ENDPOINT="${BASE_URL%/}/mcp"

# Extract a JSON-RPC `result.content[0].text` (already-parsed JSON if possible)
# from an SSE-or-JSON response body.
extract_text() {
  EXTRACT_INPUT="$(cat)" python3 - <<'PY'
import json, os, sys
text = os.environ["EXTRACT_INPUT"].strip()
if text.startswith("event:"):
    for line in text.splitlines():
        if line.startswith("data: "):
            text = line[6:]
            break
env = json.loads(text)
if "error" in env:
    sys.stderr.write(json.dumps(env["error"]) + "\n")
    sys.exit(3)
content = env.get("result", {}).get("content", [{}])[0].get("text", "")
print(content)
PY
}

# Non-exiting variant for paths that need to inspect envelope-level errors
# without `set -e` aborting the script. Emits one of:
#   ENVELOPE_ERROR:<json-encoded error>
#   PAYLOAD:<inner result.content[0].text>
#   PARSE_ERROR:<reason>
parse_envelope() {
  EXTRACT_INPUT="$(cat)" python3 - <<'PY'
import json, os, sys
text = os.environ["EXTRACT_INPUT"].strip()
if text.startswith("event:"):
    for line in text.splitlines():
        if line.startswith("data: "):
            text = line[6:]
            break
try:
    env = json.loads(text)
except json.JSONDecodeError as e:
    print(f"PARSE_ERROR:{e}")
    sys.exit(0)
if isinstance(env, dict) and "error" in env:
    print(f"ENVELOPE_ERROR:{json.dumps(env['error'])}")
    sys.exit(0)
if not isinstance(env, dict) or "result" not in env:
    print(f"PARSE_ERROR:no result key in envelope: {env!r}")
    sys.exit(0)
content = env.get("result", {}).get("content", [{}])[0].get("text", "")
print(f"PAYLOAD:{content}")
PY
}

extract_field() {
  # extract_field <json> <key>  →  prints the field value (or empty)
  EXTRACT_JSON="$1" EXTRACT_KEY="$2" python3 - <<'PY'
import json, os
data = json.loads(os.environ["EXTRACT_JSON"])
val = data.get(os.environ["EXTRACT_KEY"])
print("" if val is None else val)
PY
}

# ---------- Step 1: /health ----------
echo "appbuilder-mcp quickstart  →  ${BASE_URL}"
echo "--- read-only probe ---"
echo "[1/4] GET ${BASE_URL%/}/health"
HEALTH=$(curl -fsS -m 10 -A "${USER_AGENT}" "${BASE_URL%/}/health")
HEALTH="${HEALTH}" python3 - <<'PY'
import json, os
d = json.loads(os.environ["HEALTH"])
print("      service={service!r} version={version!r} spec={spec!r}".format(**d))
print("      tools={}".format(d["tools"]))
PY

# ---------- Step 2: initialize ----------
echo "[2/4] POST ${ENDPOINT}  (initialize)"
HEADERS_FILE="$(mktemp)"
trap 'rm -f "${HEADERS_FILE}"' EXIT
INIT_BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"appbuilder-mcp-quickstart","version":"0.1"}}}'
curl -fsS -m 30 -A "${USER_AGENT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -D "${HEADERS_FILE}" \
  -d "${INIT_BODY}" \
  "${ENDPOINT}" >/dev/null
SESSION_ID="$(grep -i '^mcp-session-id:' "${HEADERS_FILE}" | head -1 | awk '{print $2}' | tr -d '\r\n')"
if [[ -z "${SESSION_ID}" ]]; then
  echo "ERROR: no mcp-session-id returned by initialize" >&2
  exit 4
fi
echo "      session_id=${SESSION_ID}"

# notifications/initialized — required by spec, no response body
curl -fsS -m 10 -A "${USER_AGENT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: ${SESSION_ID}" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  "${ENDPOINT}" >/dev/null || true

# ---------- Step 3: tools/list ----------
echo "[3/4] tools/list"
TOOLS_RAW=$(curl -fsS -m 30 -A "${USER_AGENT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: ${SESSION_ID}" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  "${ENDPOINT}")
TOOLS_RAW="${TOOLS_RAW}" python3 - <<'PY'
import json, os
text = os.environ["TOOLS_RAW"].strip()
if text.startswith("event:"):
    for line in text.splitlines():
        if line.startswith("data: "):
            text = line[6:]
            break
env = json.loads(text)
tools = env["result"]["tools"]
print("      {} tools reported by the deploy:".format(len(tools)))
for t in tools:
    desc = (t.get("description") or "").replace("\n", " ")
    if len(desc) > 80:
        desc = desc[:77] + "..."
    print("        - {}: {}".format(t["name"], desc))
PY

# ---------- Step 4: docs probe (with one retry for cold-start) ----------
# The deployed worker can surface docs-upstream timeouts in two ways and the
# retry needs to fire on either:
#   a) In-payload error — result.content[0].text contains JSON with "error".
#   b) JSON-RPC envelope error — top-level "error" key, no "result". With
#      set -euo pipefail this would abort the script before retry, so we use
#      parse_envelope here instead of extract_text.
echo "[4/4] tools/call docs(query='payload construction', depth=1)"
docs_call() {
  local id="$1"
  curl -fsS -m 45 -A "${USER_AGENT}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":${id},\"method\":\"tools/call\",\"params\":{\"name\":\"docs\",\"arguments\":{\"query\":\"payload construction\",\"depth\":1}}}" \
    "${ENDPOINT}"
}

probe_docs() {
  local id="$1"
  local raw parsed
  raw=$(docs_call "${id}")
  parsed=$(echo "${raw}" | parse_envelope)
  case "${parsed}" in
    ENVELOPE_ERROR:*)
      DOCS_ENVELOPE_ERR="${parsed#ENVELOPE_ERROR:}"
      DOCS_TEXT=""
      DOCS_ERR=""
      ;;
    PARSE_ERROR:*)
      echo "      docs returned unparseable response: ${parsed#PARSE_ERROR:}" >&2
      exit 5
      ;;
    PAYLOAD:*)
      DOCS_ENVELOPE_ERR=""
      DOCS_TEXT="${parsed#PAYLOAD:}"
      DOCS_ERR=$(extract_field "${DOCS_TEXT}" "error" || echo "")
      ;;
    *)
      echo "      parse_envelope returned unexpected output: ${parsed}" >&2
      exit 5
      ;;
  esac
}

is_timeout_signal() {
  local s="$1"
  [[ -n "${s}" && "${s}" == *"timed out"* ]]
}

probe_docs 11
if is_timeout_signal "${DOCS_ENVELOPE_ERR}"; then
  echo "      cold-start envelope error on first call (${DOCS_ENVELOPE_ERR}); retrying once..."
  sleep 2
  probe_docs 12
elif is_timeout_signal "${DOCS_ERR}"; then
  echo "      cold-start in-payload timeout on first call (${DOCS_ERR}); retrying once..."
  sleep 2
  probe_docs 12
fi
if [[ -n "${DOCS_ENVELOPE_ERR}" ]]; then
  echo "      docs returned envelope error after retry: ${DOCS_ENVELOPE_ERR}" >&2
  exit 5
fi
if [[ -n "${DOCS_ERR}" ]]; then
  echo "      docs returned error after retry: ${DOCS_ERR}" >&2
  exit 5
fi
DOCS_TEXT="${DOCS_TEXT}" python3 - <<'PY'
import json, os
d = json.loads(os.environ["DOCS_TEXT"])
ans = (d.get("answer") or "")[:120].replace("\n", " ")
print("      governance_source={!r}".format(d.get("governance_source")))
print("      sources={}  answer[0:120]={!r}".format(len(d.get("sources") or []), ans))
PY
echo "--- read-only probe complete ---"

if [[ "${DO_BUILD}" -eq 0 ]]; then
  echo
  echo "Not submitting a build (default). Re-run with --build to trigger submit_build."
  exit 0
fi

# ---------- --build: submit + poll ----------
echo
echo "[BUILD 1/3] tools/call submit_build (payload from ${PAYLOAD_PATH})"
PAYLOAD_JSON=$(cat "${PAYLOAD_PATH}")
SUBMIT_BODY=$(PAYLOAD_JSON="${PAYLOAD_JSON}" python3 - <<'PY'
import json, os
payload = json.loads(os.environ["PAYLOAD_JSON"])
print(json.dumps({
    "jsonrpc": "2.0",
    "id": 20,
    "method": "tools/call",
    "params": {"name": "submit_build", "arguments": {"payload": payload}},
}))
PY
)
SUBMIT_RAW=$(curl -fsS -m 60 -A "${USER_AGENT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: ${SESSION_ID}" \
  -d "${SUBMIT_BODY}" \
  "${ENDPOINT}")
SUBMIT_TEXT=$(echo "${SUBMIT_RAW}" | extract_text)
JOB_ID=$(extract_field "${SUBMIT_TEXT}" "job_id")
CACHED=$(extract_field "${SUBMIT_TEXT}" "cached")
APK_PRED=$(extract_field "${SUBMIT_TEXT}" "predicted_apk_url")
if [[ -z "${JOB_ID}" ]]; then
  echo "            submit_build returned an unexpected payload:" >&2
  echo "${SUBMIT_TEXT}" >&2
  exit 6
fi
echo "            job_id=${JOB_ID}"
echo "            cached=${CACHED}"
echo "            predicted_apk_url=${APK_PRED}"
if [[ "${CACHED}" == "True" || "${CACHED}" == "true" ]]; then
  echo "            (cache hit — no Container run; APK already in R2)"
  exit 0
fi

echo
echo "[BUILD 2/3] polling get_job_status every 5s (timeout ${POLL_SECONDS}s)"
LAST_SIG=""
DEADLINE=$(( $(date +%s) + POLL_SECONDS ))
while [[ $(date +%s) -lt ${DEADLINE} ]]; do
  STATUS_RAW=$(curl -fsS -m 30 -A "${USER_AGENT}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":21,\"method\":\"tools/call\",\"params\":{\"name\":\"get_job_status\",\"arguments\":{\"job_id\":\"${JOB_ID}\"}}}" \
    "${ENDPOINT}")
  STATUS_TEXT=$(echo "${STATUS_RAW}" | extract_text)
  STATE=$(extract_field "${STATUS_TEXT}" "state")
  FAIL_MODE=$(extract_field "${STATUS_TEXT}" "failure_mode" || echo "")
  SIG="${STATE}|${FAIL_MODE}"
  if [[ "${SIG}" != "${LAST_SIG}" ]]; then
    PROGRESS=$(extract_field "${STATUS_TEXT}" "progress" || echo "")
    echo "            state=${STATE}  failure_mode=${FAIL_MODE}  progress=${PROGRESS}"
    LAST_SIG="${SIG}"
  fi

  # Terminal if EITHER signal has fired. The worker has been observed to
  # leave state="running" while failure_mode="success" on the success path
  # (a state-machine race with the container's callback). Accept either.
  IS_TERMINAL=0
  case "${STATE}" in
    succeeded|failed|cancelled) IS_TERMINAL=1 ;;
  esac
  case "${FAIL_MODE}" in
    success|hard|soft) IS_TERMINAL=1 ;;
  esac

  if [[ "${IS_TERMINAL}" -eq 1 ]]; then
    echo
    echo "[BUILD 3/3] terminal state=${STATE}  failure_mode=${FAIL_MODE}"
    APK_URL=$(extract_field "${STATUS_TEXT}" "apk_url" || echo "")
    LOG_URL=$(extract_field "${STATUS_TEXT}" "log_url" || echo "")
    echo "            apk_url=${APK_URL}"
    echo "            log_url=${LOG_URL}"
    # Success: failure_mode=success OR state=succeeded (preferring failure_mode
    # since that's the signal the container writes itself).
    if [[ "${FAIL_MODE}" == "success" || "${STATE}" == "succeeded" ]]; then
      exit 0
    fi
    if [[ "${FAIL_MODE}" == "hard" || "${FAIL_MODE}" == "soft" || "${STATE}" == "failed" ]]; then
      exit 1
    fi
    # state == "cancelled" or any other terminal-but-not-success outcome
    exit 1
  fi
  sleep 5
done
echo "            timed out (last signature: ${LAST_SIG}) after ${POLL_SECONDS}s"
echo "            job_id=${JOB_ID} — re-poll later with get_job_status if you want to keep waiting"
exit 3
