# SPEC-AMENDMENT — shared-state conflicts make per-PR rows rebase-thrash

> Filed during the build session for `klappy/appbuilder-mcp` per
> `docs/parity-spec.md` §6.2. The spec asks for one PR per row and
> requires every PR to (a) update `docs/parity-matrix.md` `status` and
> (b) append to `docs/work-log.md`. In practice, the cumulative effect
> is that every PR conflicts with every other PR that hasn't merged yet,
> so each merge forces a full rebase pass on every open PR. Operator
> directive: "this is unacceptable; it's pointless for each PR to be
> discrete."

## Section being amended

`docs/agent-prompts/02-build-session.md` §"Per-gap loop" steps 5–6,
in conjunction with `docs/parity-spec.md` §2 DoD evidence form #1
("PR body names the matrix row(s)") and §6.1 (forbidding matrix row
text rewrites).

## Current criterion (verbatim)

From `docs/agent-prompts/02-build-session.md`:

```
5. Append to `docs/work-log.md`: timestamp, gap, PR link, assumptions, canon
   consulted.
6. Mark the matrix row `status: in_review` (not `closed` — that's the
   validator's call).
```

## Proposed criterion

```
5. Add `docs/work-log/<branch-kebab>.md` capturing: timestamp, gap, PR
   link, assumptions, canon consulted. One file per PR. The build
   session never edits a shared `docs/work-log.md` — aggregation, if
   desired, is generated.
6. The build session does NOT edit `docs/parity-matrix.md`. Matrix
   `status` field transitions (`open` → `in_review` on PR open;
   `in_review` → `closed` on validator accept) are owned by the
   validator session, which performs the matrix bump as part of its
   merge atom. The build-session PR body must still name the matrix
   row(s) being closed by ID (existing DoD evidence form #1) so the
   validator has unambiguous targets for the bump.
```

## Evidence

What the build session attempted, observed, and what canon was consulted:

### Observed conflict pattern (this session)

- **PR #6** (P1.1) added `docs/work-log.md` and updated matrix §3 row
  "test/ directory" to `in_review`.
- **PR #7** (P1.2/P1.3/P1.4) added `docs/work-log.md` (add/add conflict
  with #6 the moment #6 merged) and updated matrix §3 row
  "Schema-pinning tests" — adjacent line to #6's edit, producing a
  textual conflict in addition to the work-log conflict.
- **PR #8** (P1.6) — required a fresh branch off the post-#6 main; the
  matrix conflict re-surfaced because the in-flight #7 had also updated
  rows in the same table.
- **PR #9** (P1.7) — same pattern.

Net effect: each merge of one PR forces a rebase pass on every
in-flight PR. Two shared mutable files (work-log + matrix) cross-couple
otherwise independent code changes. The "one PR per row" discipline
loses its discreteness benefit.

### Canon consulted

- `docs/parity-spec.md` §6.1 ("rows may share a PR if they have a
  hard dependency"). Hard dependencies fold cleanly into one PR; the
  rebase problem is a soft cross-coupling the spec did not contemplate.
- `docs/parity-spec.md` §8.2 disposition vocabulary. Validator already
  has `accept` / `iterate` / `pivot`; adding "matrix bump on accept" is
  a small extension of `accept`, not a new disposition.
- `klappy://canon/principles/dry-canon-says-it-once` — the matrix is
  the canonical row-status registry; every PR re-asserting status in a
  PR body is fine, every PR _editing_ the registry is the duplication
  that produces conflicts.
- `klappy://canon/bootstrap/model-operating-contract` §"Bottleneck
  Respect" — operator attention is finite; rebase thrash externalizes
  cost onto the bottleneck.

### What was attempted

The session followed the spec literally for PRs #6, #7, #8, #9. The
operator merged #6 directly; the build session rebased #7 onto the new
main and resolved both files' conflicts manually (kept both work-log
entries; merged matrix row updates row-by-row). The pattern would have
to repeat for every subsequent merge.

## Impact

### Rows affected

- All future P1, P2, P3 rows. None are individually blocked, but every
  one inherits the same rebase pain unless this is fixed.
- The in-flight `feat/snapshot-mechanism` (P2.8–P2.11 cluster, currently
  ~600 LOC of `src/snapshot.ts` + tests + wrangler.jsonc + route) is the
  next PR; can ship under the new pattern if approved.

### Whether the build session can continue with non-affected rows

Yes. The amendment touches only the per-gap loop's bookkeeping, not any
row's substantive acceptance criteria. The build session can continue
with the new pattern (per-PR work-log files, no matrix edits) immediately
on operator approval; existing PRs (#7, #8, #9) keep their current
shape since they're already in flight.

## Recommended disposition

`accept` with the following operator actions:

1. Approve the proposed criterion above (one-line operator OK is enough).
2. The build session adopts per-PR work-log files (`docs/work-log/<branch>.md`)
   and stops editing `docs/parity-matrix.md` from build-session PRs.
3. The in-flight PRs #7, #8, #9 keep their existing matrix edits and the
   merged work-log; the validator simply confirms the bumps already
   present.
4. A follow-up `parity-spec-v2.md` codifies the change so future build
   sessions inherit it.

If the operator prefers `pivot` (declare current spec broken on this
axis, restart with v2), the build session stops on this row and waits
for the v2 spec. Recommended: `accept` since the change is small and
mechanical.

---

**Filed:** 2026-05-01T11:50Z
**Branch in flight:** `feat/snapshot-mechanism` (P2.8/P2.9/P2.10/P2.11
cluster) — ~600 LOC `src/snapshot.ts` + wrangler.jsonc updates already
on disk; awaiting operator decision before commit + push.
