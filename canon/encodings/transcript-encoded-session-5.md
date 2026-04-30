---
title: "appbuilder-mcp Server — Transcript Encoding Session 5 (2026-04-30 H-002 first smoke surfaces -build + -i format bugs)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "transcript", "dolceho", "session-5", "h-002", "smoke", "sab-cli", "debug-keystore"]
extends: "transcript-encoded-session-4.md"
encoded_at: 2026-04-30T22:35:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/values/axioms (Reality Is Sovereign; A Claim Is a Debt; You Cannot Verify What You Did Not Observe)
  - klappy://canon/bootstrap/model-operating-contract
companion_artifacts:
  - "Dockerfile (debug.properties printf line: rewritten to `-ksp/-ka/-kap` flag form, the actual `-i` additional-parameters-file format)"
  - "container/main.py (cmd appends `-build`; docstring rewritten to cite SIL PDF §4.14 and explain the priming-script trap)"
  - "canon/articles/cli-reference.md (entire 'flag-by-flag' rewritten: `-build` documented as required, `-i` corrected from 'keystore-info' to 'additional parameters file', `-ksp/-ka/-kap` documented per SIL PDF page 38)"
---

# appbuilder-mcp Server — Transcript Encoding Session 5

> First end-to-end smoke (H-002) caught two bugs that the static analysis
> in sessions 1–4 missed because both were inherited from a non-functional
> upstream artifact (the priming script in `sillsdev/docker-appbuilder-agent`'s
> ansible role). The container was invoking SAB with `-new` only — which
> creates the project on disk but does not compile — and the bundled
> debug-keystore "info file" was written in Java-style `key=value` form
> instead of SAB's actual `-i` format (a flat list of CLI flags). Both
> were fixed and the canon `cli-reference.md` was rewritten to follow the
> SIL "Building Apps" PDF §4.14 (page 37–38), which is the authoritative
> source. H-006 closes (deploy is healthy). H-002 stays active until the
> session-5 redeploy is observed and the smoke produces an APK.
>
> ID continuity: session 4 ended at D-010, O-010, L-006, H-006 active,
> Open-008. Session 5 uses D-011, D-012, O-011, O-012, O-013, L-007,
> L-008, H-006 (closes), H-002 (still active), H-007 (new),
> Open-009 (new).

---

## D — Decisions

### D-011 — Add `-build` to the SAB CLI invocation

`container/main.py`'s `run_scripture_app_builder` appends `-build` to
the assembled `cmd` after the existing `-fp build=<dir>` flag. This is
the flag that tells SAB to actually compile the project, per the SIL
"Building Apps" PDF §4.14 (page 37): "*-build  Build app project (use
with either -new or -load)*". The PDF's worked example — `sab -new -n
"My App" -p com.example.myapp -b MyBookBundle.zip -f "Charis SIL
Compact" -i keys.txt –build` — confirms the trailing `-build`.

**Trigger.** O-012: first H-002 smoke exited 0 in 4 seconds with no
APK. Two attempts (one minimum payload, one full priming-script-mirror
payload with about + two icons) both produced the same banner-then-exit
behavior, ruling out missing-optional-fields as the cause.

**Operator framing.** *(implicit, derived from project posture: "fastest
possible today" + the operator's pointer to the SIL PDF in the project
instructions.)*

**Rationale.**

1. *Reality is sovereign.* The PDF, written by SIL for the SAB tool
   they ship, is the authoritative CLI reference. The priming script in
   `docker-appbuilder-agent` was treated as an authority during
   sessions 1–4 because it was the most-readable example we had — and
   it was wrong.
2. *KISS.* `-build` is one flag. No design tradeoffs.
3. *Maintainability — one person indefinitely.* Documenting in code
   *why* `-build` is unconditional (with a comment pointing to the PDF
   section and the H-002 finding) prevents the next session from
   re-investigating the same bug.

**Cross-ref.** Codified in `container/main.py` cmd assembly. Triggers
H-007 (observe redeploy + re-smoke).

### D-012 — Rewrite bundled debug-keystore "info file" to SAB's actual `-i` format

The Dockerfile's `printf` line that creates `/app-builders/debug-keystore/
debug.properties` was emitting Java-style `key=value` lines:

```
storePassword=appbuilder-mcp-debug
keyAlias=appbuilder-mcp-debug
keyPassword=appbuilder-mcp-debug
```

This was based on the canon CLI reference article's prior incorrect
documentation of `-i` as a "keystore-info" file. SAB's `-i` is in fact
"Include additional parameters file" (per PDF page 37), and the file
format is a flat list of CLI flags. The line `storePassword=...` is
not a SAB flag, so SAB silently ignored the file — meaning the
container's debug-keystore credentials were never actually applied.

The new file format:

```
-ksp appbuilder-mcp-debug
-ka appbuilder-mcp-debug
-kap appbuilder-mcp-debug
```

These three lines correspond to PDF page 38's `-ksp <password>`, `-ka
<alias>`, and `-kap <password>` flags. The `keystore_prime.txt` in the
docker-appbuilder-agent priming files uses the same format (verified
this session); the priming script *was* correct on this point — only
the canon article and this repo's debug.properties were wrong.

**Trigger.** Same as D-011 (O-012). When investigating the silent
exit, found that the `-i` file format had been misdescribed in canon
and miscopied into the Dockerfile.

**Operator framing.** Same as D-011.

**Rationale.**

1. *Reality is sovereign.* `keystore_prime.txt` in
   `sillsdev/docker-appbuilder-agent/ansible/roles/app-builders/files/`
   uses `-ksp/-ka/-kap` flags. PDF page 38 documents the same. Two
   sources agree; our internal note was the outlier.
2. *Truth-debt audit.* The previous canon article confidently asserted
   the `key=value` format. There was no PDF citation, no priming-file
   citation; just an unverified claim that propagated to code. Axiom
   2 (A Claim Is a Debt) — the debt was repaid this session.

**Cross-ref.** Codified in `Dockerfile` (RUN block that creates
debug.properties) and `canon/articles/cli-reference.md` (`-i` and
`-ks/-ksp/-ka/-kap` sections rewritten). Triggers H-007 (observe
redeploy + re-smoke; confirms signing now actually applies).

---

## O — Observations (closed)

### O-011 — H-006 closure: live deploy healthy with 6 tools and burrito-pinned image

`curl https://appbuilder-mcp.klappy.workers.dev/health` returns:

```json
{
  "ok": true,
  "service": "appbuilder-mcp",
  "version": "0.1.0",
  "spec": "v1.3-draft",
  "tools": ["submit_build", "get_job_status", "cancel_job",
            "docs", "telemetry_public", "telemetry_policy"]
}
```

HTTP 200, content-type `application/json`. MCP `initialize` over the
streamable-HTTP transport at `/mcp` returns `protocolVersion:
2024-11-05` and 6 tools via `tools/list`. The deploy is live and the
session-4 commit
(`01c8e8c feat(burrito): pin appbuilder-agent-stg:feature-scripture-burrito`)
is in production.

**Closure rule.** H-006's "When the deploy lands and `/health` is 200,
encode O-011 in session 5 with the deploy id, build duration, and any
observed pitfalls." The deploy id was not retained from the build log;
build duration is unknown to this session (the operator can read it
from the CF dashboard if needed for cost calibration). Two observed
pitfalls: (a) Open-009 below — the `/health` endpoint reports `spec:
v1.3-draft` while canon says the spec is at `v1.1-draft`; (b) the
Cloudflare 1010 bot-signature block on default Python `urllib`
User-Agent strings — first smoke attempt was 403'd until the smoke
script set a custom UA (`appbuilder-mcp-h002-smoke/0.1`).

### O-012 — H-002 first attempt: SAB exits 0 in 4 seconds with no APK

Two `submit_build` calls were dispatched against the live deploy:

| Attempt | payload_hash (= job_id) | Started | Completed | Wall-clock | exit_code | failure_mode | apk |
|---|---|---|---|---|---|---|---|
| 1 (minimum) | `8f085fe6...78b165` | 22:29:30Z | 22:29:34Z | 4 s | 0 | hard | none |
| 2 (priming-mirror, with about + 2 icons) | `18150dec...b6e29` | 22:31:19Z | 22:31:23Z | 4 s | 0 | hard | none |

Both returned `state: failed`, `failure_mode: hard`, `apk_r2_key: null`.

The full container log for attempt 1 (594 bytes) shows SAB:

1. Detecting architecture (`amd64`).
2. Printing the SAB version banner (`Version 14.0`, `Build Release
   127 (30-Apr 2026)` for attempt 1; `Build Release 129` for attempt 2
   — internal release counter increments between invocations even when
   no APK is produced).
3. Printing the `Create New App Project:` parameter echo (app name,
   package name, font, keystore path, build folder, book filename).
4. Exiting cleanly with no further output, no error message, no
   "Building..." phase.

Attempt 2 with the full priming-mirror payload showed SAB also
acknowledging the about file path and the two icon paths
("Launcher icon: ... (xxhdpi)", "Launcher icon: ... (hdpi)"). Same
4-second silent exit. This eliminated "missing optional fields" as the
cause — SAB receives every input it asks about and still does not
build.

**Root cause** found via PDF retrieval (see O-013 below): SAB's
`-new` mode creates the project on disk and exits without compiling.
`-build` is required to trigger compilation. D-011 lands the fix.

**Closure rule.** O-012 is the empirical record of the bug. H-002
remains active until the post-session-5 redeploy + retest produces
`failure_mode: success` and a real APK lands at `apk_url`.

### O-013 — SIL "Building Apps" PDF §4.14 documents the actual SAB CLI surface

Fetched from
`https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-02-Building-Apps.pdf`
(operator-supplied URL in the project instructions; 197 pages, 7.4 MB).
Page 36–37 is "4.14. Can I build an app from the command line?". Page
37 enumerates 25 flags, including:

- `-new            Create a new app project`
- `-load <project> Load an existing app project`
- `-build          Build app project (use with either -new or -load)`
- `-no-save        Do not save changes to app (use with -load)`
- `-?              Show command line help`

And on signing:

- `-ks  <filename>   Set keystore filename`
- `-ksp <password>   Set keystore password`
- `-ka  <alias>      Set key alias`
- `-kap <password>   Set key alias password`

And on the additional parameters file:

- `-i   <filename>   Include additional parameters file. Use the full
   path of the file and enclose it in "double quotes" if there is a
   space in the path.`

The worked example on page 38 reads:

```
sab -new -n "My App" -p com.example.myapp -b MyBookBundle.zip
    -f "Charis SIL Compact" -i keys.txt –build
```

`-build` at the end. The priming script in
`sillsdev/docker-appbuilder-agent/ansible/roles/app-builders/tasks/
main.yml` does NOT pass `-build` — which is consistent with the
ansible role's "Prime gradle cache with build" step being commented
out: it never actually built anything.

**Closure rule.** This is the canon-of-record reference for the SAB
CLI. `canon/articles/cli-reference.md` was rewritten this session to
follow the PDF rather than the priming script.

---

## L — Lessons (canon-eligible)

### L-007 — Authoritative documentation > convenient examples (priming-script trap)

Sessions 1–4 used the priming script in `docker-appbuilder-agent` as
the de-facto SAB CLI reference because (a) it was the readable form of
"how does the operator's existing infrastructure invoke this thing"
and (b) it was easier to grep than the 197-page SIL PDF. That was a
false economy: the priming script was itself non-functional (omitted
`-build`), and treating it as authoritative cost three sessions of
canon writing (cli-reference.md drafted, refined, cited from spec) and
one round of code (Dockerfile debug-keystore + container CLI
assembly) before H-002 surfaced both bugs in one shot.

**Rule.** When canonizing CLI surfaces, deployment shapes, or any
upstream contract, the authoritative documentation from the upstream
project is the source of truth. Convenience examples (priming
scripts, internal CI scripts, third-party blog posts) are
*supplementary evidence* — useful for confirming the docs *and the
example agree* — but never authoritative on their own. If the example
contradicts the docs, the docs are right and the example is broken
(per L-007 here, almost always).

**Provenance.** Born out of sessions 1–4 inheriting the priming
script's structure verbatim, then session 5's first H-002 smoke
exposing both bugs at once. Three sessions of canon-and-code drift
paid because nobody fetched the SIL PDF until the smoke forced it.
The PDF was always linked from the operator's project instructions.

### L-008 — GitHub raw `etag` is NOT the file sha256

`curl -I` against
`https://raw.githubusercontent.com/sillsdev/docker-appbuilder-agent/master/ansible/roles/app-builders/files/eng-web_usfm.zip`
returns `etag:
"fe682d48f86bcf4bc086d5df39bb8d8548a3ee4bc582f54a5b8a41e390117adb"` —
a 64-character hex string that *looks* like a sha256 but is in fact
GitHub's internal blob etag (likely the git blob SHA-256, which is
computed over a `blob <size>\0<content>` envelope, not the raw bytes).
The actual file sha256 (computed locally with `sha256sum`) is
`3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278` —
different value.

**Rule.** Never trust upstream-server-supplied identifiers as content
hashes for `payload.bible_source.sha256` or any other content-addressed
field. Compute hashes locally over the bytes you actually received,
the way the receiver downstream (the Container's `fetch_and_verify`)
will compute them. Treat upstream "etag" / "Content-MD5" / similar as
opaque opaque cache keys, never as authentication.

**Provenance.** Caught while constructing the H-002 smoke fixture; the
local `sha256sum` produced a different value than GitHub's etag, and
we used the locally-computed value in the payload.

---

## C — Constraints (none new)

This session adds no new constraints. C-001..C-006 carry forward
unchanged.

---

## H — Handoffs

### H-006 — CLOSED (Workers Builds redeploy of burrito-pinned image)

Closed by O-011 this session. `/health` returns 200 with `version:
0.1.0`, the burrito-pinned image is live, MCP `initialize` succeeds,
and 6 tools are listed. Two pitfalls noted (Open-009: spec-string
drift; the CF 1010 bot block on default Python UA, mitigated by
custom User-Agent in the smoke script).

### H-002 — STILL ACTIVE (first end-to-end smoke produces an APK)

Carries forward from session 1; this session bisected the failure
mode to two upstream-CLI-misuse bugs (D-011, D-012) and lands the fix
in code + Dockerfile + canon. H-002 closes when:

1. The session-5 commit lands a Workers Builds redeploy (H-007).
2. `/health` continues to return 200 against the new deploy.
3. A `submit_build` payload (`smoke.py` or equivalent against WEB
   USFM) produces `state: succeeded`, `failure_mode: success`,
   `apk_url` populated.
4. The APK is fetched and validated as a real Android package
   (`unzip -l` shows `AndroidManifest.xml` + `META-INF/`; `apkanalyzer`
   or `aapt dump badging` reports the package name and label set in
   the payload).

### H-003 — STILL ACTIVE (telemetry-governance fresh-context review)

Carries forward unchanged.

### H-007 — NEW: observe Workers Builds redeploy of session-5's commit

**One-line scope.** The session-5 commit, when pushed to `main`,
triggers a Workers Build that rebuilds the Container with the corrected
debug.properties, redeploys the Worker with the corrected `cmd`
assembly in `container/main.py`, and serves the new image.

**Validation.**

1. `git push` to `main` triggers Workers Builds.
2. Build succeeds (no syntax / build errors from the changes).
3. `curl https://appbuilder-mcp.klappy.workers.dev/health` returns 200
   with the same `version: 0.1.0`.
4. A fresh `submit_build` against the WEB USFM fixture (smoke.py
   payload, perturb the `name` field if needed to bust the cache from
   today's `8f085fe6...` and `18150dec...` failed jobs) returns a
   *different* job_id this time *and* eventually transitions to
   `state: succeeded` with a real APK URL.

**Closure rule.** When step 4's APK lands and validates as an Android
package, encode O-014 with the deploy id, build wall-clock, APK size,
and any soft markers in the log. Close H-007 *and* H-002 in that
encoding. If the APK does not land, encode the new failure mode and
revert to planning (do not chase further fixes inside execution).

**Rollback.** The two changes are surgical and backward-compatible
with each other. If the session-5 commit fails to deploy or the APK
still doesn't land, `git revert` restores the session-4 state (no
worse than current). The bugs found this session don't have a "wrong
fix" path — `-build` is documented; the `-i` format is documented.

---

## E — Externals (none new)

No new external dependencies. The SIL "Building Apps" PDF was
referenced in the operator's project instructions from session 1; this
session was the first to retrieve and parse it.

---

## Open items (forward)

### Open-009 — `/health` spec drift: deploy reports `v1.3-draft`, canon says `v1.1-draft`

The live `/health` response includes `"spec": "v1.3-draft"`, but
`canon/specs/appbuilder-mcp-v1-spec.md` is at `version: v1.1-draft`
per session-4 D-009. The string `v1.3-draft` likely came from the
ptxprint-mcp scaffold, where v1.3 is the live spec. A code search for
the literal `v1.3-draft` in `src/index.ts` or `src/telemetry.ts`
should locate the source. Align by either (a) bumping canon to
`v1.3-draft` if the AppBuilder spec is in fact at v1.3 in spirit
(unlikely; v1.1 was just the burrito addition), or (b) changing the
code constant to `v1.1-draft` to match canon.

**Risk if ignored.** Telemetry will tag events with the wrong spec
version, complicating future archaeology of which behavior was live
when. Low priority but should be cleaned up before v1.2 lands.

### Open-007 — Promote `agent-stg:feature-scripture-burrito` → `agent-prd:<tag>` (carries from session 4)

### Open-008 — Single-platform amd64 manifest observation (carries from session 4)

### Open-006 — Image disk-margin observation (carries from session 3)

---

## ID continuity through session 5

- **D**: D-001..D-012
- **O**: O-001..O-013
- **L**: L-001..L-008
- **C**: C-001..C-006
- **H**: H-001 (closed s4), H-002 (active), H-003 (active),
  H-004 (closed s1), H-005 (superseded s4), H-006 (closed s5),
  H-007 (active until next deploy + smoke land)
- **Open**: Open-005 (closed s3), Open-006 (active), Open-007 (active),
  Open-008 (active), Open-009 (active)

Session 6 continues at D-013, O-014, L-009, H-008, Open-010 if new
items emerge.
