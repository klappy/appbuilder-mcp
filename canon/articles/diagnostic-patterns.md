---
uri: klappy://canon/articles/diagnostic-patterns
title: "SAB Diagnostic Patterns — Reading the Build Log to Find the Real Cause"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "scripture-app-builder", "sab", "diagnostics", "failure-modes", "gradle", "android", "keystore", "usfm", "agent-kb"]
epoch: E0008
date: 2026-05-01
derives_from: "klappy://canon/governance/headless-operations §Part 11, klappy://canon/articles/failure-mode-taxonomy, container/main.py:classify_failure(), fixtures/h009..h010-full"
governs: "the agent-facing catalogue of SAB build-failure patterns: trigger, observable signature in log_tail or job state, root cause, and remediation. Read this when get_job_status reports failure_mode hard or soft."
companion_to: "klappy://canon/governance/headless-operations Part 11"
status: working
---

# SAB Diagnostic Patterns — Reading the Build Log to Find the Real Cause

> When a build fails, the difference between a 30-second fix and a
> 30-minute investigation is whether the agent recognizes the
> signature in `log_tail`. This article is the catalogue: 8 named
> patterns, each with the smallest distinguishing log fragment, the
> root cause, and the remediation. The agent's job is pattern-match
> the signature, then act.

## Summary — How to use this catalogue

`get_job_status` returns `failure_mode` plus the last ~256 lines of
the SAB build log as `log_tail`. Most SAB failures fall into one of
the patterns below. The agent walks the patterns in order; the first
matching signature wins. If none match, treat as `unknown` —
surface `log_tail` to the user and recommend a reduced-scope retry.

Every pattern below names:

- **Trigger** — what the user / agent did that produced the failure.
- **Observable signature** — the smallest log fragment (or job-state
  field) that lets the agent recognize the pattern. Match these
  case-sensitively unless noted.
- **Root cause** — the underlying reason; the *what changed*.
- **Remediation** — the smallest fix that resolves the case.

Healthy-input shape references live in `fixtures/h009`, `fixtures/h010a`,
`fixtures/h010b`, `fixtures/h010-full` — when an input looks unlike
those fixtures, suspect shape before suspecting SAB.

---

## Pattern 1 — Gradle dependency resolution failure

- **Trigger:** any submission whose container instance was cold-started
  and the gradle cache had to re-resolve.
- **Observable signature** in `log_tail`:

  ```
  > Could not resolve all dependencies for configuration ':*'
  Could not resolve <group>:<artifact>:<version>
    > Could not get resource '<https url>'
  ```

  Often paired with `BUILD FAILED` further down. `failure_mode`:
  **`soft`** (SAB ran; gradle errored) or **`timeout`** if the resolve
  hung past `BUILD_TIMEOUT_DEFAULT`.
- **Root cause:** the upstream Maven / Google Maven mirror returned a
  transient error during cold start. Cache was empty so there was no
  fallback.
- **Remediation:** **resubmit the same payload.** Cache hit on
  successful prior build saves the wall-clock; on the second attempt
  the gradle cache is warm and the resolution skips. If three
  consecutive resubmissions fail with the same signature, escalate —
  upstream Maven is genuinely down or the container's network egress
  is misconfigured.

---

## Pattern 2 — Keystore password mismatch (production signing)

- **Trigger:** the agent supplied a `keystore` block whose
  `info.json` carried the wrong `keystore_password` or `key_password`
  for the supplied `.jks`.
- **Observable signature** in `log_tail`:

  ```
  Failed to read key <alias> from store "<path>": keystore password was incorrect
  ```

  Or:

  ```
  jarsigner: unable to recover key from keystore
  ```

  `failure_mode`: **`soft`**. The APK is partially built but unsigned;
  no `apk_r2_key` is uploaded.
- **Root cause:** a typo in the info file's `keystore_password` or
  `key_password`, OR the keystore was rotated since the info file was
  authored. Common when the operator regenerated the keystore but
  did not update the info file alongside.
- **Remediation:** **never put the password in chat or tool calls.**
  Have the user re-upload the info file with the correct password to
  their hosting URL, refresh the `info_sha256`, and resubmit. If the
  user has lost the password, the keystore is unrecoverable — they
  must publish the next app version with a new package name (Android
  cannot resign a published package with a different key).

---

## Pattern 3 — Missing keystore for production build

- **Trigger:** the agent was instructed to produce a Play Store-eligible
  build but constructed a payload without the `keystore` block (so SAB
  fell back to the bundled debug keystore).
- **Observable signature:** the build **succeeds**. `failure_mode:
  success`. But the resulting APK's signature certificate is the
  bundled debug certificate (visible to anyone running
  `apksigner verify --print-certs <apk>` against the artifact). Play
  Store rejects on upload.
- **Root cause:** the agent silently took the debug-keystore path
  because the `keystore` block was absent. SAB does not error on
  missing production keystore; it falls through to the bundled debug
  key.
- **Remediation:** the agent should refuse to claim "Play Store ready"
  on any build that omits `keystore`. When the user asks for a
  production build, the payload **must** carry a `keystore` block;
  treat its absence as a payload-construction error before submission.
  See Part 5 of `klappy://canon/governance/headless-operations` for the
  block shape.

---

## Pattern 4 — Android manifest merge conflict

- **Trigger:** the SAB build generated a `<uses-permission>` or
  `<application>` attribute conflicting with one declared in a library
  manifest (typically a Firebase / Crashlytics / Google Play Services
  module pulled in by SAB upstream).
- **Observable signature** in `log_tail`:

  ```
  AAPT: error: failed processing manifest.
  Manifest merger failed : Attribute <attr-name> value=(...) from <Foo:1>
    is also present at <Bar:2> value=(...).
  Suggestion: add 'tools:replace="<attr>"' to <element> element at <line>
  ```

  `failure_mode`: **`soft`**.
- **Root cause:** the upstream SAB image bundles a transitive
  dependency that conflicts with one of the user's build options
  (e.g. enabling `build_modern_pwa: true` may pull in a different
  Activity declaration).
- **Remediation:** the v1 payload schema does not yet expose manifest
  override hooks. Three options, in priority order: (1) toggle off the
  build option that introduced the conflict (e.g.
  `build_modern_pwa: false`); (2) wait for the upstream SAB image to
  publish a manifest fix; (3) for power users, the operator can
  override the container image pin in `Dockerfile` with a patched
  manifest — out of scope for the agent.

---

## Pattern 5 — ABI mismatch / missing native libraries

- **Trigger:** the agent was told to install on a specific device
  whose ABI is not in the upstream SAB image's universal APK
  (extremely uncommon — the universal APK includes all four major
  ABIs).
- **Observable signature:** the build **succeeds** but `adb install`
  on the target device fails with:

  ```
  INSTALL_FAILED_NO_MATCHING_ABIS: Failed to extract native libraries, res=-113
  ```

  This is observable only post-install, not in `log_tail`.
- **Root cause:** the device runs an ABI (e.g. `mips`,
  `armeabi` non-`v7a`, `x86` 32-bit) that SAB's upstream universal APK
  does not include. The Android SDK has been dropping legacy ABIs
  over multiple releases.
- **Remediation:** confirm the device's ABI with
  `adb shell getprop ro.product.cpu.abi`. If the device is post-2018,
  the universal APK should match — re-check device-side log
  (`adb logcat -d | grep -i 'abi\|native'`). If the device truly is on
  a dropped ABI, no v1 payload setting helps; the user must upgrade
  the device or wait for the v1.x `abi_filters` schema extension.

---

## Pattern 6 — Malformed USFM input

- **Trigger:** the user supplied a USFM zip whose contents fail SAB's
  pre-build USFM validator (open-paragraph mid-chapter, unclosed
  marker pair, illegal `\v` outside `\c`, etc.).
- **Observable signature** in `log_tail`:

  ```
  ERROR: USFM validation failed in <book-code>.SFM at line <N>:
    <specific marker error>
  ```

  Or, when SAB cannot even open the archive:

  ```
  ERROR: bible_source.url returned <status> or non-zip body
  ```

  `failure_mode`: **`hard`** for fetch / sha256 / archive errors;
  **`soft`** for USFM-parse errors after the bytes verified.
- **Root cause:** the source materials drifted from a known-good
  state, OR the user generated the zip with a non-standard USFM
  exporter.
- **Remediation:** open the offending file from the source bundle and
  fix the marker error. If the user owns Paratext, they can re-export
  with "Validate" enabled. For shape comparison, the agent can fetch
  any of `fixtures/h009/eng-web_usfm_with_booknames.zip`,
  `fixtures/h010a/eng-bsb_usx.zip`, or
  `fixtures/h010b/eng-web_project.zip` as known-healthy reference
  bundles.

---

## Pattern 7 — sha256 mismatch on input fetch

- **Trigger:** the URL the agent supplied returns bytes whose sha256
  does not match the `sha256` field in the payload.
- **Observable signature** in `log_tail`:

  ```
  sha256 mismatch for <field-name> at <url>:
    declared <hex-a>
    actual   <hex-b>
  ```

  `failure_mode`: **`hard`**. No SAB invocation occurs; the container
  short-circuits before unpacking.
- **Root cause:** either (a) the URL contents changed since the agent
  computed the hash, (b) the agent computed the hash against a
  different file (off-by-one in a directory), or (c) the URL host
  serves different content under load (e.g. CDN cache poisoning).
- **Remediation:** recompute the sha256 from the live URL bytes
  (`curl -fsSL <url> | sha256sum`) and resubmit with the correct
  digest. If the URL host genuinely returns nondeterministic content,
  move the artifact to a stable host (R2 presigned URL, GitHub
  release tag) and resubmit.

---

## Pattern 8 — Build timeout

- **Trigger:** SAB ran but did not finish within
  `BUILD_TIMEOUT_DEFAULT` (1800 s = 30 min in `wrangler.jsonc`).
- **Observable signature:** `state: failed`, `failure_mode: timeout`.
  `log_tail` may end mid-task — the absence of `BUILD SUCCESSFUL` /
  `BUILD FAILED` is itself the signal.
- **Root cause:** typically a Gradle dependency re-resolve from a
  cold container that genuinely exceeds the budget (large project +
  empty cache + slow upstream Maven). Less commonly, an infinite-loop
  in a custom Gradle plugin pulled in by an upstream SAB upgrade.
- **Remediation:** **resubmit on a warm instance.** The second attempt
  hits the populated gradle cache and typically finishes in under
  five minutes. If three consecutive submissions time out from
  warm-instance state, the build genuinely needs a longer budget —
  the operator may bump `BUILD_TIMEOUT_DEFAULT` in `wrangler.jsonc`,
  but that is a deployment change, not an agent action.

---

## When none of these match

- Surface `log_tail` to the user verbatim. Do not paraphrase — the
  exact line is the entire diagnostic value.
- Recommend the user attempt the simplest possible payload (minimum
  viable: `{name, package, bible_source}`, no icons, no keystore,
  no PWA flag) to isolate the failing dimension.
- Encode the new pattern as a candidate addition to this article via
  `oddkit_encode` so a future session can append it.

## Cross-references

- `klappy://canon/governance/headless-operations` Part 11 — the
  operational-layer summary.
- `klappy://canon/articles/failure-mode-taxonomy` — the
  hard / soft / success / timeout / cancelled definitions.
- `klappy://canon/articles/payload-construction` — payload-by-example.
- `klappy://canon/articles/cli-reference` — the SAB CLI surface
  (`-fp`, `-b`, etc.); useful when reading the precise invocation
  the container ran.
- `klappy://canon/articles/keystore-reuse` — the production-keystore
  reuse pattern referenced by Pattern 2.
- `klappy://canon/articles/bundled-debug-keystore` — the debug-key
  fall-through Pattern 3 trips.
