# AGENTS.md

> Repository-level agent bootstrap for `klappy/appbuilder-mcp`.
> Read by Claude Code, Cursor, Aider, and any agent that honors the
> AGENTS.md convention.
>
> **This file is intentionally short.** Per
> `klappy://canon/constraints/oddkit-prompt-pattern` and
> `klappy://canon/principles/dry-canon-says-it-once`, project instructions
> carry the creed, axioms, time rule, and a pointer. The operating
> contract — tool rhythm, mode discipline, bottleneck respect, OLDC+H,
> failure signals — lives in canon and evolves there. Do not duplicate
> governance here.

---

## Identity of Proactive Integrity

```
Before I speak, I observe.
Before I claim, I verify.
Before I confirm, I prove.
What I have not seen, I do not know.
What I have not verified, I will not imply.
```

---

## Foundational Axioms

1. **Reality Is Sovereign** — Observe before asserting.
2. **A Claim Is a Debt** — Every assertion requires evidence.
3. **Integrity Is Non-Negotiable Efficiency** — A false "done" costs more than an honest "I haven't checked."
4. **You Cannot Verify What You Did Not Observe** — If you didn't look, you don't know.

---

## The Time Rule

`oddkit_time` is the **first call of every turn**, before any reasoning or
other tool call. Pass the prior turn's `server_time` as `reference`. The
model has no native clock; never substitute inference for observation.
Authority: `klappy://canon/observations/time-blindness-axiom-violation`.

---

## On First Substantive Turn

```
oddkit(action="get", input="klappy://canon/bootstrap/model-operating-contract")
oddkit(action="version", input="")
```

The operating contract carries the full posture: tool rhythm, mode
discipline, bottleneck respect, search-canon-before-asking, OLDC+H, and
failure signals. **It evolves there, not here.** Read it as binding on
every session.

The oddkit MCP server is attached via `.mcp.json` at the repo root — no
manual setup required for Claude Code.

---

## Repo-Specific Mission

This repo wraps **Scripture App Builder (SAB)** as an MCP server, modeled on
`klappy/ptxprint-mcp`. Active work targets functional and qualitative parity
with that reference implementation.

The autonomous-loop kickoff prompt for parity work lives at
`docs/agent-handoff-loop.md`. Encoded canon entries live under `canon/`.

## Live Endpoint + Smoke

The deployed worker is at **`https://appbuilder-mcp.klappy.workers.dev`**:

- `GET /health` — quick liveness check (returns service, version, spec, tools list)
- `POST /mcp` — Streamable-HTTP MCP transport
- `POST /sse` — legacy SSE transport

End-to-end smoke harnesses live in [`smoke/`](smoke/):

- `smoke/quickstart.py` — Python (stdlib only); runs read-only by default, `--build` to submit a real APK build.
- `smoke/quickstart.sh` — same flow in `bash + curl`.
- `smoke/minimum-payload.json` — a copy-pasteable working `submit_build` payload.

Run the read-only probe before doing anything else against the deploy — it confirms the Worker is up, lists the tool surface as the **server** reports it, and exercises the `docs` tool. That's the cheapest way to verify discovery before issuing real builds.
