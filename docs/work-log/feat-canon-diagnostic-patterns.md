---
title: "Build Session Work Log — feat/canon-diagnostic-patterns"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.13"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for P2.13 (canon/articles/diagnostic-patterns.md); per-PR file per the SPEC-AMENDMENT-shared-state-conflicts pattern"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4 P2.13"
---

# 2026-05-01 — P2.13: canon/articles/diagnostic-patterns.md

- **Branch:** `feat/canon-diagnostic-patterns`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.13):**
  - At least 6 SAB-specific diagnostic patterns documented.
  - Each pattern names: trigger, observable signature, root cause, remediation.
  - Passes Writing Canon checklist (§2.1).
  - Where possible, cross-references existing fixtures under `fixtures/`.

- **Files added:**
  - `canon/articles/diagnostic-patterns.md` — **new**, 8 patterns:
    1. Gradle dependency resolution failure
    2. Keystore password mismatch (production signing)
    3. Missing keystore for production build
    4. Android manifest merge conflict
    5. ABI mismatch / missing native libraries
    6. Malformed USFM input
    7. sha256 mismatch on input fetch
    8. Build timeout
  - `docs/work-log/feat-canon-diagnostic-patterns.md` — **new**.

- **Verification:**
  - 8 patterns ≥ 6 (spec minimum).
  - Each pattern names trigger / observable signature / root cause /
    remediation in that order.
  - Pattern 6 explicitly cross-references
    `fixtures/h009/eng-web_usfm_with_booknames.zip`,
    `fixtures/h010a/eng-bsb_usx.zip`, `fixtures/h010b/eng-web_project.zip`
    as healthy-shape reference bundles.
  - Frontmatter satisfies Writing Canon §2.1: `epoch`, `derives_from`,
    `governs`. Title names the concept and stance ("Reading the Build
    Log to Find the Real Cause"). Blockquote summary captures the full
    operating contract. Headers pass the scan test (each pattern's `##`
    header names what the pattern is). No buried claims.

- **Assumptions made (no operator):**
  - Picked 8 patterns instead of the minimum 6 because Patterns 7
    (sha256 mismatch) and 8 (timeout) are common-enough in cold-start
    flows that omitting them would produce a "neither of these match"
    fall-through for very common cases. The cost of two extra patterns
    is small; the value to the agent is large.
  - Pattern 3 ("missing keystore for production build") is a "happy
    failure" — the build SUCCEEDS but the result is wrong. Documented
    explicitly because the agent has to refuse to claim "Play Store
    ready" on a debug-signed APK; without this pattern, the agent
    silently green-lights an unshippable build.
  - Did NOT include patterns for failure modes outside the
    container — e.g. "Worker rejected the payload at schema validation"
    (Pattern 6 partly covers fetch errors). Those happen at submit
    time, not after dispatch; they belong in `payload-construction`
    article, not here.
  - Cross-references the forthcoming `failure-mode-taxonomy` article
    (referenced by `klappy://canon/articles/failure-mode-taxonomy`).
    If that article does not exist yet, the link is forward-looking;
    the validator should confirm path.

- **Canon consulted:**
  - `klappy://canon/governance/headless-operations` Part 11 (the
    summary; this article is the catalogue Part 11 names).
  - `wrangler.jsonc` (`BUILD_TIMEOUT_DEFAULT = 1800`).
  - `fixtures/h009..h010-full` README files (verified healthy-shape
    references).
  - `container/main.py:classify_failure()` — referenced in the
    `derives_from` frontmatter; the patterns here are the operational
    counterpart to that classifier's log-string matching.

- **Risks for the validator:**
  - Pattern 5 (ABI mismatch) is rarely-triggered in practice — the
    universal APK covers all major ABIs. The pattern is useful
    defensively but the validator may want to flag it as a candidate
    for `Open gaps` rather than the main catalogue if reality stays
    benign.
  - Patterns 1, 8 both recommend "resubmit" as remediation. The cost
    of a wrong resubmit is one container-build wall-clock (~5 min); the
    cost of skipping resubmit when it would have worked is a manual
    investigation. The pattern's recommendation skews toward retry —
    operator may prefer a tighter "diagnose first" stance.
  - The article does not yet enumerate `tools:replace="..."` rewrite
    patterns for Pattern 4 (manifest merge). That is genuinely
    out-of-scope for the v1 schema (the agent has no manifest-override
    knob); a future schema extension would prompt an update here.
