---
title: "Build Session Work Log — feat/canon-workflow-recipes"
audience: project
exposure: working
voice: neutral
stability: append_only
tags: ["work-log", "build-session", "parity", "P2.14"]
date: 2026-05-01
status: working
governs: "build-session ledger entry for P2.14 (canon/articles/workflow-recipes.md); per-PR file"
derives_from: "BLOCKERS/SPEC-AMENDMENT-shared-state-conflicts.md, docs/parity-spec.md §4 P2.14"
---

# 2026-05-01 — P2.14: canon/articles/workflow-recipes.md

- **Branch:** `feat/canon-workflow-recipes`
- **PR:** _to be appended once opened_
- **Spec criteria (`docs/parity-spec.md` §4 P2.14):**
  - At least 3 end-to-end recipes: minimum-viable APK,
    debug-install-and-launch on a connected device, smoke-test cycle
    (build → adb install → adb logcat capture).
  - Each recipe is reproducible from a clean repo by an agent
    following only the doc.
  - Passes Writing Canon checklist (§2.1).

- **Files added:**
  - `canon/articles/workflow-recipes.md` — **new**, 3 recipes:
    1. Minimum-viable APK (payload → cached/built → apk_url)
    2. Install and launch on a connected Android device (curl + adb)
    3. Build → install → logcat smoke cycle (Recipes 1 + 2 + 30 s logcat)
  - `docs/work-log/feat-canon-workflow-recipes.md` — **new**.

- **Verification:**
  - 3 recipes meet the spec minimum.
  - Each recipe has a numbered `Steps:` block, a single-line `Outcome:`
    declaration, an explicit `Prerequisites:` block, and a `Sanity check`
    section that names the smallest observable proving success.
  - Frontmatter satisfies Writing Canon §2.1: `epoch`, `derives_from`,
    `governs`. Title names the concept and stance ("End-to-End Flows
    from Payload to Running App"). Blockquote summary captures the
    operating contract (3 recipes; self-contained; step-by-step; small
    command set). Every recipe heading and Sanity-check sub-heading
    passes the scan test.
  - "When a recipe fails mid-stream" section names the diagnostic-path
    explicitly — no buried claims.

- **Assumptions made (no operator):**
  - **Bookkeeping pattern:** per-PR work-log file; no edits to
    `docs/parity-matrix.md`.
  - **Tooling assumption:** `adb`, `curl`, `sha256sum`, `grep`,
    `timeout` are on the agent's PATH (or the operator's). On a
    Windows host the agent should sub-shell into WSL or substitute
    PowerShell equivalents — not documented inline because the SAB
    install side already requires Android SDK platform-tools, which
    pulls in adb.
  - **adb install vs install -r:** Recipe 2 uses plain `adb install`
    and falls back to `adb uninstall + adb install` on
    `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Did NOT recommend `-r` (replace
    existing) because `-r` errors out when the signing variant differs
    — uninstall is the only path through that case. Documented both.
  - **30-second logcat window:** picked because it covers app-launch +
    first-network-call + first-frame; longer windows catch fewer
    issues per second of human/agent attention. Not a hard rule.
  - **Sanity-check style:** every recipe ends with a one-liner
    `test -s ... && ! grep -q ...` style check that emits
    `smoke ok` / `smoke failed`. Easier for an agent to interpret
    than free-form descriptions.

- **Canon consulted:**
  - `klappy://canon/governance/headless-operations` Part 7 (build
    lifecycle), Part 12 (recovery workflows).
  - `klappy://canon/articles/payload-construction` (referenced by
    Recipe 1).
  - `klappy://canon/articles/diagnostic-patterns` (referenced by all
    three recipes when steps fail).
  - `klappy://canon/articles/apk-installation` (referenced by Recipe 2
    for USB debugging / signing-mismatch reinstall).

- **Risks for the validator:**
  - The article references `klappy://canon/articles/apk-installation`
    which exists in the appbuilder-mcp canon already. Validator should
    spot-check that the link resolves.
  - Recipe 2 step 4 names `<main-activity>` placeholder, which an
    agent has to derive from the manifest. Could be replaced with the
    convention `<package>/<package>.MainActivity` for SAB-built apps,
    but SAB occasionally emits a `MainActivity` under a different
    sub-package depending on the project's Android version target.
    Documenting both the lookup and the convention is the safer
    middle ground.
  - The 30-second logcat window catches startup crashes but misses
    deferred-network-failure crashes (10+ seconds in). A v2 recipe
    could parameterize the window length; out of scope for this PR.
