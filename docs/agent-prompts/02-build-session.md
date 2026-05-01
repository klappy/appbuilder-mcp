# Build Session — Close Gaps Against the Frozen Spec

> Paste this as the initial message to a **Claude Code** session opened in
> `klappy/appbuilder-mcp`. This session executes against the merged spec.
> It does not redesign the spec.

## Pre-conditions

- `docs/parity-matrix.md` and `docs/parity-spec.md` exist on `main` and
  reflect the latest spec session output.
- If either file is missing, **stop immediately** and write
  `BLOCKERS/BLOCKER-no-spec-<UTC-ts>.md`. Do not invent a spec.

## Mission

Close gaps from the frozen `docs/parity-matrix.md` until the spec's
Definition of Done is met. One gap per branch per PR, in priority order.

## Discipline

- `AGENTS.md` is read on startup; `oddkit_time` first call; first turn fetches
  `klappy://canon/bootstrap/model-operating-contract`.
- **Mode: execution.** Make calls, document assumptions, proceed. No
  clarifying questions — there is no operator. Reversion is allowed but must
  be named (one sentence, one reason).
- The spec is **frozen.** If discovery during execution suggests the spec is
  wrong, do **not** silently amend it. Open
  `BLOCKERS/SPEC-AMENDMENT-<slug>.md` with the proposed change, evidence,
  and impact, then continue with the next non-affected gap.
- Per-PR validation is **out of scope.** Run smoke checks for your own use,
  but the binding validation runs in a fresh session against the merged PR.

## Per-gap loop

1. Pick the highest-priority open row from `docs/parity-matrix.md`.
2. Preflight: `oddkit_preflight(input="<gap description>")`.
3. Branch, implement, commit.
4. Push, open PR titled `feat(<area>): close parity row <ID>`.
5. Append to `docs/work-log.md`: timestamp, gap, PR link, assumptions, canon
   consulted.
6. Mark the matrix row `status: in_review` (not `closed` — that's the
   validator's call).
7. Loop.

## Stop conditions

- All matrix rows in priority tiers 1 and 2 reach `status: in_review` or
  `status: closed`.
- Or: `BLOCKER-*` count exceeds remaining gaps (more blocked than buildable).
- Or: a `SPEC-AMENDMENT-*` proposal is open that blocks the rest of the work
  — escalate to operator and stop.

Full process reference: `docs/agent-handoff-loop.md` §§ Phase B–H.
