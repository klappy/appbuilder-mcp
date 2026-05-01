---
uri: klappy://canon/articles/workflow-recipes
title: "SAB Workflow Recipes — End-to-End Flows from Payload to Running App"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "scripture-app-builder", "sab", "workflows", "recipes", "adb", "smoke-test", "agent-kb"]
epoch: E0008
date: 2026-05-01
derives_from: "klappy://canon/governance/headless-operations, klappy://canon/articles/payload-construction, klappy://canon/articles/diagnostic-patterns, klappy://canon/articles/apk-installation"
governs: "the agent-facing recipe collection for end-to-end SAB flows: build a minimum-viable APK, install and launch on a connected device, run a build → install → logcat smoke cycle. Each recipe is self-contained and reproducible from a clean repo."
companion_to: "klappy://canon/governance/headless-operations Part 12"
status: working
---

# SAB Workflow Recipes — End-to-End Flows from Payload to Running App

> Three recipes: minimum-viable APK from a single payload, install-
> and-launch on a connected Android device, and the build → install →
> logcat smoke cycle. Each recipe is self-contained — an agent
> following only the recipe should reach the named outcome from a
> clean repo. Recipes are written in the "what the agent does" voice,
> step-by-step, with the smallest reasonable command set.

## Summary — How to use this article

Each recipe declares an **outcome** (the named end state) and a
**prerequisite** block (what must be true before the recipe runs).
Steps are numbered. Every command is a one-liner the agent issues
literally — placeholders are in `<angle-brackets>`. After every
recipe, a "Sanity check" section names the smallest observable that
proves success.

Pick the recipe whose outcome matches the user's request. Don't try
to interleave them; their steps don't compose pleasantly. The
diagnostic catalogue at
[`klappy://canon/articles/diagnostic-patterns`](klappy://canon/articles/diagnostic-patterns)
covers what to do when a step fails.

---

## Recipe 1 — Minimum-viable APK

**Outcome:** A debug-signed APK reachable at `apk_url`, built from
the minimum payload (no icons, no about file, no production keystore,
no PWA flag).

**Prerequisites:**

- The user has a USFM zip (Paratext export, or one of the
  `fixtures/h009..h010b` bundles) reachable at an HTTPS URL.
- The user knows the sha256 of that zip (or the agent computes it via
  `curl -fsSL <url> | sha256sum`).
- An MCP client is connected to a deployed appbuilder-mcp Worker
  (see `DEPLOY.md` for deploy and `/health` confirmation).

**Steps:**

1. Compute the sha256 of the bible source if the user did not supply
   it:

   ```bash
   curl -fsSL <bible-source-url> | sha256sum
   ```

2. Construct the payload (in MCP client memory, not on disk):

   ```json
   {
     "schema_version": "1.0",
     "name": "<App display name, ≤ 64 chars>",
     "package": "<reverse-DNS, e.g. org.example.scripture>",
     "bible_source": {
       "kind": "usfm_zip",
       "url": "<bible-source-url>",
       "sha256": "<the digest from step 1>"
     }
   }
   ```

3. Call `submit_build` with the payload as the `payload` argument.
   The response carries either:

   - `cached: true` + `predicted_apk_url` → the build is already in
     R2; no further work. Skip to sanity-check.
   - `cached: false` (or absent) + `job_id` → continue to step 4.

4. Poll `get_job_status({job_id})` every 10–15 s. The state walks
   `queued → running → succeeded`. The `progress` field (if present)
   gives intra-state granularity.

5. On `state: succeeded` and `failure_mode: success`, read `apk_url`
   from the job-state response.

**Sanity check:**

```bash
curl -fsSL -I "<apk_url>"
# Expect: HTTP/2 200 ; Content-Type: application/octet-stream
```

If `failure_mode` is anything other than `success`, switch to
`klappy://canon/articles/diagnostic-patterns` — match the signature
in `log_tail` to a pattern, apply remediation, restart at step 3.

---

## Recipe 2 — Install and launch on a connected Android device

**Outcome:** The APK from Recipe 1 (or any prior successful build) is
installed on a USB-connected Android device and is running on screen.

**Prerequisites:**

- Recipe 1 has completed and `apk_url` is known.
- An Android device is connected via USB with USB debugging enabled
  (`Settings → System → Developer options → USB debugging`).
- `adb` from the Android SDK platform-tools is on the agent's PATH
  (or the operator has it).
- The agent has filesystem write access (Claude Desktop's filesystem
  mode, or equivalent) — the APK has to live on disk for `adb
  install`.

**Steps:**

1. Confirm the device is reachable:

   ```bash
   adb devices -l
   # Expect: at least one line with `device` (not `unauthorized` or `offline`)
   ```

   If the device shows `unauthorized`, ask the user to accept the
   debug-key prompt on the device.

2. Download the APK to a temp file:

   ```bash
   curl -fsSL "<apk_url>" -o /tmp/<package>.apk
   ```

3. Install. For a fresh package, plain install:

   ```bash
   adb install /tmp/<package>.apk
   ```

   If the user previously installed a different signing variant of
   the same package, Android refuses with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
   Resolve with:

   ```bash
   adb uninstall <package>
   adb install /tmp/<package>.apk
   ```

   (Note that uninstall wipes user data. Recipe 3 covers a non-
   destructive variant for repeated smoke runs.)

4. Launch the main activity. SAB's main activity name is conventionally
   `<package>/<package>.MainActivity` — confirm via the manifest if
   you don't already know it:

   ```bash
   adb shell pm dump <package> | grep -A1 "android.intent.action.MAIN"
   # Look for the `Activity:` line under the MAIN intent filter.
   ```

   Then launch:

   ```bash
   adb shell am start -n <package>/<main-activity>
   ```

**Sanity check:**

```bash
adb shell dumpsys activity activities | grep -i "topResumedActivity"
# Expect: a line containing <package>/.MainActivity
```

If the app crashed on launch, `adb logcat -d -t 200 | grep -E "AndroidRuntime|FATAL"` extracts the crash trace.

---

## Recipe 3 — Build → install → logcat smoke cycle

**Outcome:** A complete one-shot smoke pass: payload submitted, APK
built, APK installed, main activity launched, first 30 s of logcat
captured to a local file. Used to confirm a payload change reaches
the device with no regressions.

**Prerequisites:**

- Recipe 1 prerequisites.
- Recipe 2 prerequisites (connected device).
- A running shell on the agent's host with `adb` available.

**Steps:**

1. Run Recipe 1 to obtain `apk_url` and `<package>` (the package name
   matches what was in the payload).

2. Pre-install: clear logcat to avoid mixing prior crash traces into
   the smoke output.

   ```bash
   adb logcat -c
   ```

3. Run Recipe 2 steps 2–4 to install and launch.

4. Capture the first 30 s of logcat into a file:

   ```bash
   timeout 30 adb logcat -v time *:I > /tmp/<package>.smoke.log
   ```

   (`*:I` filters to Info-and-above. Drop the filter if you want
   the full DEBUG/VERBOSE stream — it's noisier but catches
   subtle issues.)

5. Inspect the captured log for FATAL / ANR markers:

   ```bash
   grep -E "FATAL EXCEPTION|ANR in|AndroidRuntime: " /tmp/<package>.smoke.log | head -20
   ```

   No matches → smoke passed. Matches → diagnose against
   `klappy://canon/articles/diagnostic-patterns`.

**Sanity check:**

```bash
test -s /tmp/<package>.smoke.log && \
  ! grep -q "FATAL EXCEPTION\|ANR in\|AndroidRuntime: " /tmp/<package>.smoke.log && \
  echo "smoke ok" || echo "smoke failed — inspect /tmp/<package>.smoke.log"
```

`smoke ok` is the green light: the APK installed, the activity
launched, no crashes in the first 30 s of logcat.

---

## When a recipe fails mid-stream

1. **Capture the failure point.** Note which numbered step produced
   the unexpected output. The recipe's structure makes this trivial —
   the user can resume from that step after the fix.

2. **Match against `klappy://canon/articles/diagnostic-patterns`.**
   That article carries 8 named patterns covering most SAB build
   failures. The smallest log fragment is enough to recognize a
   pattern.

3. **Resubmit unchanged before resubmitting changed.** Cold-start
   transient failures (Pattern 1, gradle dependency resolution;
   Pattern 8, timeout) are the dominant case in steady-state
   operation. A second attempt against a warm container hits the
   gradle cache and finishes in < 5 minutes.

4. **Surface `log_tail` verbatim if no pattern matches.** Do not
   paraphrase — the exact log line is the diagnostic.

## Cross-references

- `klappy://canon/governance/headless-operations` — the operational
  framing for these recipes (especially Part 7 for the build
  lifecycle and Part 12 for recovery workflows).
- `klappy://canon/articles/payload-construction` — payload-by-example.
- `klappy://canon/articles/diagnostic-patterns` — what to do when a
  recipe step fails.
- `klappy://canon/articles/apk-installation` — Android-side install
  details (USB debugging prompt, signing-mismatch reinstall, ABI
  notes).
