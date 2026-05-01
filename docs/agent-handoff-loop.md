# Autonomous Build Loop — `klappy/appbuilder-mcp` to Parity with `klappy/ptxprint-mcp`

> Paste this as the initial prompt to a **Claude Code** session opened in
> the `klappy/appbuilder-mcp` repository.
>
> **Posture and tools are already attached.** `AGENTS.md` and `.mcp.json` are
> committed to the repo. Claude Code reads `AGENTS.md` on startup (the
> Identity of Proactive Integrity, the four axioms, time-first, mode
> discipline, search-canon-first, OLDC+H, the lean-bootstrap pointer to
> oddkit) and `.mcp.json` attaches the oddkit MCP server. This prompt does not
> repeat any of that — read `AGENTS.md` if you have not.

---

## 1. Mission

Bring **`klappy/appbuilder-mcp`** to functional and qualitative parity with
**`klappy/ptxprint-mcp`** as the reference implementation, targeting **SAB
(Scripture App Builder)** as the wrapped product. "Parity" means:

- Every conceptually applicable tool that `ptxprint-mcp` exposes has a SAB
  equivalent in `appbuilder-mcp`.
- Schemas, error envelopes, transport, packaging, and observability match the
  reference's quality bar.
- README, examples, and CI green-state are at or above the reference.
- A clean install → connect → tool-call walkthrough succeeds end-to-end
  against a real or fixture SAB project.

You operate **without an operator in the loop**. Every instinct to "ask for
clarification" must collapse into either (a) make the call and proceed with
the assumption documented, or (b) write `BLOCKERS/BLOCKER-<UTC-ts>.md` and
move on to a non-blocked gap. Never pause waiting for input.

---

## 2. First Turn

Per `AGENTS.md`:

1. `oddkit_time` — anchor the clock.
2. `oddkit(action="get", input="klappy://canon/bootstrap/model-operating-contract")` — fetch the evolving operating contract.
3. `oddkit(action="version", input="")` — record canon commit.
4. Declare mode out loud.

Then proceed to Phase A.

---

## 3. Reference Repository

The reference lives at `https://github.com/klappy/ptxprint-mcp`. Clone it once
to a sibling directory for read-only inspection:

```bash
git clone https://github.com/klappy/ptxprint-mcp ../ptxprint-mcp
```

Do not modify it. Re-pull when you suspect drift.

You are already inside `klappy/appbuilder-mcp`. Use git directly — Claude
Code has native git via bash. No `gh` MCP server, no GitHub tokens in this
prompt. If `gh` CLI is available locally and authenticated to the user's
account, you may use it for PR creation; otherwise push branches and the
operator opens PRs out-of-band.

---

## 4. The Loop

Canonical pattern from `klappy://docs/planning/the-loop-every-role-same-infrastructure`:
**converse → generate → validate → promote or pivot.**

### Phase A — Discovery (run once at session start; rerun when state shifts materially)

Catalog `ptxprint-mcp` end-to-end on these dimensions:

- Tools exposed (name, input schema, output schema, behavior, error modes)
- Transport (stdio? streamable HTTP? both?)
- Packaging and install story
- README quality, examples, troubleshooting
- Test layout and coverage
- CI workflows, release pipeline, version strategy
- Observability (logs, telemetry, error envelopes)

Catalog `appbuilder-mcp` current state on the same dimensions. Read SAB
documentation/source for any tool you intend to expose — do not infer SAB
behavior from `ptxprint`. They are different products.

Write `docs/parity-matrix.md` with a row per dimension, columns:
`ptxprint-mcp state | appbuilder-mcp state | gap | priority | status`.

```bash
git checkout -b chore/seed-parity-matrix
git add docs/parity-matrix.md
git commit -m "chore(parity): seed parity matrix"
git push -u origin chore/seed-parity-matrix
```

Open a PR (via `gh` if available, otherwise push and note in the work log).
Self-merge once green.

### Phase B — Prioritize

Pick the single highest-leverage open gap. Heuristic order:

1. Foundational over additive (transport / scaffolding before nice-to-haves).
2. Blocking over polish (broken install before missing example).
3. Simple over complex when impact is comparable (ship momentum).

One gap = one branch = one PR. No multi-gap branches.

### Phase C — Preflight

```
oddkit_preflight(input="<plain-language description of what you're about to build>")
oddkit(action="search", input="<key terms specific to this work>")
```

Read returned canon docs, constraints, DoD, pitfalls. If `NEEDS_ARTIFACTS`
appears anywhere, **produce the artifact** — do not skip and do not ask
whether it's required.

### Phase D — Plan (write it down)

In a scratch file `.work/plan-<branch>.md`:

- Restate the gap as a falsifiable outcome.
- List required artifacts (code, tests, docs).
- List acceptance criteria — each runnable or inspectable.
- Note assumptions you are making in lieu of asking.

### Phase E — Execute

```bash
git checkout main && git pull
git checkout -b feat/<short-kebab-name>
# implement
# add or update tests
# update README, examples, schemas to match
git add -A
git commit -m "feat: <conventional commit>"
```

No clarifying questions during this phase. If you find yourself drafting one,
either resolve it from canon/axioms/evidence, or stop and write a `BLOCKER`.

### Phase F — Validate

This is where most autonomous loops fail. Be ruthless:

1. Run the full test suite. **See it pass with your own eyes** — do not trust
   "it should pass."
2. Start the MCP server. Connect to it (mcp-inspector or a scripted client).
   Call each affected tool. Verify response shape, content, and error paths.
3. Compare behavior against `ptxprint-mcp` for the analogous capability where
   one exists. Note divergences in `docs/parity-matrix.md`.
4. Run the validation action:

   ```
   oddkit(action="validate", input="<your completion claim with artifact references>")
   ```

5. If `NEEDS_ARTIFACTS`: produce them, then re-validate. Do not declare done.
6. If validation reveals a failure: do **not** ship. Either fix in the same
   branch or write a `BLOCKER` and abandon the branch.

Validation contract: `klappy://docs/agents/validation/protocols/validation-protocol`.

### Phase G — Ship

```bash
git push -u origin feat/<short-kebab-name>
```

If `gh` CLI is available:

```bash
gh pr create --fill --base main --body "$(cat .work/pr-body-<branch>.md)"
```

PR body must include:

- Parity matrix row(s) closed
- Acceptance-criteria evidence (test output snippets, tool-call transcripts)
- Assumptions made without asking
- Links to canon docs consulted
- Updated parity matrix delta

After CI passes, self-merge:

```bash
gh pr merge --squash --delete-branch  # if gh available
git checkout main && git pull
```

If `gh` is not available, push the branch and append the PR-pending state to
`docs/work-log.md` so the operator can complete it asynchronously. Continue
to Phase H — do not block the loop on PR mechanics.

### Phase H — Encode & loop

```
oddkit(action="encode", input="<decision, insight, or constraint discovered>", mode="canon-tier-2")
```

`oddkit_encode` does **not** persist. Save the returned artifact to
`docs/canon/<slug>.md`, commit, push.

Update `docs/work-log.md` with: timestamp, gap closed, PR link or pending
status, validation evidence pointers, decisions encoded.

Loop back to Phase B.

---

## 5. Definition of Done (Session-Level)

The loop terminates only when **all** are true:

- [ ] `docs/parity-matrix.md` shows zero open gaps in priority tiers 1 and 2.
- [ ] Every conceptually applicable `ptxprint-mcp` tool has a working SAB
      equivalent.
- [ ] Test coverage ≥ `ptxprint-mcp` (measure both, write the numbers in the
      work log).
- [ ] CI green on `main` for the latest commit.
- [ ] A scripted end-to-end walkthrough (clean install → connect → exercise
      every tool → teardown) runs in CI at `scripts/e2e-walkthrough.sh`.
- [ ] README quality reviewed against `ptxprint-mcp`'s README on these axes:
      install clarity, tool reference, troubleshooting, example transcripts.
- [ ] `oddkit(action="validate", input="appbuilder-mcp at parity with ptxprint-mcp per docs/parity-matrix.md")`
      returns a passing result with all artifact references resolvable.

When DoD is met, write `docs/parity-achieved-<YYYY-MM-DD>.md` with the final
parity matrix snapshot, the validate output, and a list of canon entries
encoded during the run. Commit, push, stop.

---

## 6. Blocker Protocol

Write `BLOCKERS/BLOCKER-<UTC-timestamp>.md` and abandon the current branch if:

- A gap requires SAB API or source access you cannot obtain through public
  means.
- Two consecutive validation cycles fail on the same root cause.
- Canon is silent and the axioms do not derive a clear path forward.
- A required external service (GitHub, the oddkit MCP server) is unavailable
  for more than three retry cycles with backoff.

Each blocker file contains:

- What you tried (commands, evidence)
- Canon consulted (URIs)
- The single specific question you would ask if an operator were available
- The non-blocked work you are pivoting to next

Then **continue with the next non-blocked gap** from the parity matrix. Do
not halt the loop on a single blocker.

---

## 7. Anti-Patterns to Refuse

You are at high risk of these in autonomous mode. Catch yourself:

- **"Should pass" / "looks correct" / "I believe this works"** — claims
  without evidence. Run it and quote the output, or do not claim it.
- **Asking for clarification during execution** — there is no one to ask.
  Make the call, document the assumption, proceed.
- **Reframing the goal mid-execution** — the goal at the gate is the goal
  delivered. New ideas go in `BACKLOG.md`, not into the current branch.
- **Skipping `oddkit(action="validate", ...)` because "the change is small"**
  — small changes break parity matrices too. Validate everything.
- **Declaring done while `NEEDS_ARTIFACTS` is open** — produce the artifact.
- **Inferring SAB behavior from ptxprint behavior** — verify each against
  its own source of truth.
- **Editing `docs/parity-matrix.md` to remove a gap without closing it** —
  the matrix is append-only for closed work; never delete open rows to make
  the matrix look better.

---

## 8. Reporting Cadence

Append to `docs/work-log.md` after every loop iteration (success or blocker):

```markdown
## <UTC ISO timestamp>

- **Gap:** <row from parity matrix>
- **PR:** <link or "pending — branch pushed">
- **Validation evidence:** <test output snippet path, transcript path>
- **Assumptions made:** <list>
- **Canon consulted:** <URIs>
- **Encoded:** <docs/canon/<slug>.md if any>
- **Status:** shipped | blocked → <BLOCKER file>
```

This is the only record the operator will read. If it isn't in the work log,
it didn't happen.

---

## 9. Closing Posture Reminder

Reality is sovereign. A claim is a debt. You cannot verify what you did not
observe. Ship evidence, not assertions. The operator's attention is the
bottleneck — your job in autonomous mode is to spend zero of it until DoD is
met or a real blocker forces a hand-back.

`oddkit_time` first. Then bootstrap. Then declare mode. Then Phase A.
