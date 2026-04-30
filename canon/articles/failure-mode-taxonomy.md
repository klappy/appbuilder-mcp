---
uri: klappy://canon/articles/failure-mode-taxonomy
title: "Failure Mode Taxonomy — Hard, Soft, and Success"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "failure-modes", "diagnostics", "validation"]
derives_from: "klappy://canon/articles/failure-mode-taxonomy (ptxprint-mcp — same three-mode pattern, AppBuilder-specific markers)"
companion_to: "canon/specs/appbuilder-mcp-v1-spec.md, canon/articles/cli-reference.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft
---

# Failure Mode Taxonomy — Hard, Soft, and Success

> Exit code zero plus an APK on disk is necessary but not sufficient for a
> good build. Soft failures — APKs that built but are subtly broken — are
> the silent-degradation surface this taxonomy exists to make visible.

---

## The three modes

| Mode | Meaning | Trigger |
|---|---|---|
| `hard` | The build process did not produce a usable APK. | Non-zero exit code, or zero exit with no `.apk` file in the build output. |
| `soft` | An APK was produced, but the run log surfaces markers we treat as quality regressions. | Heuristic match against a small set of soft-marker strings in the SAB log. |
| `success` | An APK was produced and the run log contains no soft markers. | Default. |

The `failure_mode` field on `get_job_status` carries one of these three
values. The `state` field is independent: a soft failure has
`state = "succeeded"` (the build process completed) but
`failure_mode = "soft"` (the artifact has issues). A hard failure has
`state = "failed"` and `failure_mode = "hard"`.

---

## Soft markers (v0.1, heuristic)

Implemented in `container/main.py:classify_failure()`:

```
- "WARNING: Failed to sign"
- "FAILED"
- "BUILD FAILED"
```

Match is case-insensitive. The presence of any of these strings in the
captured stdout/stderr promotes a `success` to a `soft`.

This is a deliberately **narrow** starting set. False-positive risk: a
benign log line containing "FAILED" (e.g. "Skipped: already FAILED test")
would over-classify. The mitigation is the corpus-build process: as we
run real builds, we observe what the log actually says when the APK is
quietly broken, and we refine the marker list against ground truth.

The corpus discipline (mirrors ptxprint-mcp's evolution of its own
classifier):

1. Submit a known-good payload, observe `success` log. Record markers
   that should *never* appear.
2. Submit a deliberately broken payload (bad keystore, malformed bible
   zip), observe the log. Identify markers that reliably appear when
   the build is broken.
3. Promote markers to the classifier only when both directions are
   confirmed (appears on broken builds, absent on good builds).

Don't anticipate soft markers. Add them as observation, not foresight.

---

## What an agent does with each mode

### `success`

Trust the APK. `apk_url` is a real install candidate.

### `soft`

The APK exists at `apk_url` and may install. Do not redistribute. Read
`log_url` (the full log) and `log_tail` (the last 4 KB inline in the job
state) to determine the issue. Common causes (anticipated; refine as we
observe):

- Signing failed silently (debug keystore had issues, or the
  caller-supplied keystore had a misconfigured info file).
- A required asset (icon, about) was malformed enough that SAB substituted
  a default and emitted a warning.
- An upstream SAB regression that warrants reporting.

Treat soft failures as "investigate, then re-submit with corrections."

### `hard`

No APK. The most useful field is `log_tail` and the `errors` array.
Common causes:

- sha256 mismatch on a fetched URL (Container-side validation; rejected
  before SAB ran).
- SAB process exit code non-zero (CLI argument validation, malformed
  bible zip, unrecoverable build error).
- Container or Worker infrastructure failure (rare; surfaces as a
  Worker-emitted error in `errors[]`).

For Container/Worker errors, retry with the same payload may succeed
(transient). For SAB errors, resubmitting the same payload will fail
identically — the payload needs revision.

---

## Why three modes, not two

The two-mode model — `succeeded` / `failed` based on exit code — has a
known failure case: "exit 0, output exists, but the output is silently
broken." For PTXprint that surfaces as PDFs missing books or
canonicalization warnings; for SAB it surfaces as APKs that won't sign
correctly or are missing icons.

The cost of the three-mode taxonomy is modest (one classifier function,
one extra enum value, one log-tail field). The benefit is that
silent-degradation incidents can be detected in aggregate: a rising
`soft` rate in the telemetry dashboard is the signal that something
upstream changed in a way we should look at.

---

## Telemetry surface

`failure_mode` is one of the AE blob dimensions for the `job_terminal`
event class. Per
`klappy://canon/governance/telemetry-governance` the enum extends
`{success, soft, hard}` with two terminal states for telemetry-only
disposition: `cancelled` and `timeout`. Those values never appear in the
agent-facing `get_job_status.failure_mode` (which is `null` for
non-typesetting/non-build terminal states).

The query "what fraction of dispatched jobs hit each mode" is the
single most useful operational question this taxonomy enables. It runs
weekly on the maintainer's dashboard.

---

## Provenance

Forked from `klappy://canon/articles/failure-mode-taxonomy`
(ptxprint-mcp). The three-mode shape, the corpus-build discipline, and
the rationale ("two modes miss silent degradation") are inherited
verbatim. The marker list is AppBuilder-specific and starts narrow by
design.
