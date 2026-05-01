# Spec Session — Build the Parity Matrix

> Paste this as the initial message to a **Claude Code** session opened in
> `klappy/appbuilder-mcp`. This session produces the spec. It does NOT
> execute against it. A separate build session will.

## Mission

Produce a frozen parity spec for bringing `klappy/appbuilder-mcp` to
qualitative and functional parity with `klappy/ptxprint-mcp` (the reference
implementation that wraps PTXprint; this repo wraps Scripture App Builder).

**Deliverables — committed on a single PR, then session ends:**

- `docs/parity-matrix.md` — row per dimension (tools, transport, packaging,
  README, tests, CI, observability), columns: `ptxprint-mcp state |
  appbuilder-mcp state | gap | priority | status`.
- `docs/parity-spec.md` — the Definition of Done, acceptance criteria per
  priority tier, and stop conditions. This is the contract the build session
  is bound by.

## Discipline

- `AGENTS.md` is read on startup; `oddkit_time` first call; first turn fetches
  `klappy://canon/bootstrap/model-operating-contract`.
- **Mode: planning.** Ask yourself questions liberally; record assumptions
  explicitly. Do not enter execution mode.
- Reference repo: `git clone https://github.com/klappy/ptxprint-mcp ../ptxprint-mcp` for read-only inspection.
- Read SAB docs/source for any tool you intend the build session to expose —
  do not infer SAB behavior from PTXprint behavior.

## Stop conditions

- Open the spec PR.
- Do **not** open feature branches.
- Do **not** modify code outside `docs/`.
- The session is done when the PR is open with both files committed.

## Out of scope

- Implementation. That belongs to the build session.
- Self-validation of the spec. That belongs to a fresh-context reviewer.

Full process reference: `docs/agent-handoff-loop.md` § Phase A.
