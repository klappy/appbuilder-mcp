# Validator Session — Review a Build PR Against the Frozen Spec

> Paste this as the initial message to a **fresh** Claude Code session
> opened in `klappy/appbuilder-mcp`. "Fresh" is load-bearing: per
> `klappy://canon/principles/verification-requires-fresh-context`, the same
> session that produced the work cannot honestly validate it.
>
> Replace `<PR_NUMBER>` below before pasting.

## Mission

Review PR `#<PR_NUMBER>` against the frozen spec
(`docs/parity-matrix.md` + `docs/parity-spec.md` on `main`) and produce a
findings file with an explicit disposition.

## Discipline

- `AGENTS.md` is read on startup; `oddkit_time` first call; first turn fetches
  `klappy://canon/bootstrap/model-operating-contract`.
- **Mode: validation.** You review artifacts; you do not modify them. Fixes
  belong to a follow-up iteration session, not to this one.
- Do **not** introduce new requirements the artifact was never asked to
  satisfy. Validation is bounded by the spec the build session was given.
- If the PR reveals the spec itself was wrong, the disposition is `pivot` —
  recommend a spec-amendment session, do not patch the PR.

## Process

1. Check out the PR locally: `gh pr checkout <PR_NUMBER>` or fetch the head ref.
2. Read the matrix row(s) the PR claims to close. Read the spec's acceptance
   criteria for those rows.
3. Run the test suite in a clean state. Quote the actual output. Don't trust
   "should pass."
4. Start the MCP server, exercise each affected tool with a scripted client,
   verify response shape and error paths against the spec.
5. Run `oddkit(action="validate", input="<PR claim with artifact references>")`
   and record the result.
6. Compare behavior against `klappy/ptxprint-mcp` for the analogous capability.

## Output

Write `docs/validations/PR-<PR_NUMBER>.md` with:

- **Spec rows under review:** matrix row IDs.
- **Acceptance criteria:** verbatim from the spec.
- **Evidence:** test output snippets, tool-call transcripts, links.
- **Findings:** specific, named, falsifiable.
- **Disposition:** one of `accept` / `iterate` / `pivot` with reasoning.
- **If `iterate`:** the scope for the iteration session — what changes, what
  stays.
- **If `pivot`:** the spec section the build revealed as wrong, and the
  recommended spec-amendment.

Comment on the PR with the disposition and a link to the validations file.

## Stop conditions

- Disposition file committed.
- PR commented.
- Session ends. Merging or iterating is not your responsibility.

Full process reference: `docs/agent-handoff-loop.md` § Phase F (the
fresh-context version of it).
