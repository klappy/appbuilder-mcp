---
uri: klappy://canon/encodings/transcript-encoded-session-7
title: "Transcript-Encoded Session 7 — H-009 Closure (BookNames.xml Falsified)"
audience: canon
exposure: working
voice: neutral
stability: working
tags: ["appbuilder", "mcp", "encoding", "session-7", "h-009", "h-008", "h-002", "book-collections", "booknames-xml", "sab-v14", "build-129"]
canonical_status: non_canonical
date: 2026-05-01
status: working
provenance: "Encoded from a single live smoke against https://appbuilder-mcp.klappy.workers.dev with a perturbed bible bundle (eng-web_usfm + generated BookNames.xml). Per the H-009 closure rule in canon/encodings/transcript-encoded-session-6.md (cont.) §H-009. No container/src/Dockerfile/wrangler changes in this session — empirical-only, scope guard respected per the session prompt."
companion_to: "canon/encodings/transcript-encoded-session-6.md, canon/articles/book-collections.md, canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md"
applied_canon:
  - "klappy://canon/principles/dry-canon-says-it-once"
  - "klappy://canon/values/axioms"
  - "klappy://canon/bootstrap/model-operating-contract"
---

# Transcript-Encoded Session 7 — H-009 Closure (BookNames.xml Falsified)

> **Scope.** A single live smoke against the deployed Worker, with one diagnostic fixture committed to `fixtures/h009/`. No container, source, Dockerfile, or wrangler changes — the session prompt's scope guard explicitly forbade them in favor of empirical confirmation before any container fix. ID continuity continues from session-6's continuation: D-018, O-019, L-013, C-009, H-010, Open-014 if new items emerge.

---

## TL;DR

H-009 (SAB v14.0 build 129 may require `BookNames.xml` to populate book collection 1) is **FALSIFIED**. A well-formed Paratext-format `BookNames.xml` was generated from the bundle's existing `\toc1`/`\toc2`/`\toc3` markers, re-zipped at the root next to the 83 USFM files, hosted at a commit-pinned `raw.githubusercontent.com` URL, and submitted via one MCP `submit_build` against the live Worker. The terminal `get_job_status` returned `state: failed`, `exit_code: 1`, `failure_mode: hard`, and the log still contains the literal complaint "**Add one or more books for book collection 1.**" — identical to session 6's report on the same Worker / image / SAB version. Adding `BookNames.xml` did not change the outcome.

H-002 and H-008 remain active. **H-008 (the Chris Hubbard / SIL question) is now the only credible next move**; the BookNames-fallback-no-longer-falls-back theory was the cheapest test we had and it returned negative. The next-cheapest move is upstream consultation, not another guess.

---

## D — Decisions

### D-018 — Take path #2: empirical confirmation before any container-side fix

The session-6 §H-009 plan offered an implicit fork once the hypothesis was framed: (1) modify the container to auto-generate `BookNames.xml` from any USFM zip lacking one, then redeploy and smoke; or (2) generate the file out-of-band, host it as a one-off fixture, smoke it through the live Worker without touching code.

D-018 chose **path #2**. Three reasons:

1. **Falsifiability before durability.** A container-side change that turns out to be unnecessary is dead weight in the codebase forever. An empirical test costs one fixture file and one smoke and tells us whether the change is worth shipping at all.
2. **Scope hygiene.** Path #1 touches `container/main.py` and re-deploys; path #2 touches only a new `fixtures/h009/` directory. The session prompt's scope guard codified this — and would have rejected path #1 even if it had been the cheaper one.
3. **Reversibility.** A fixture under `fixtures/h009/` can be deleted in one commit when H-009 closes. A container behavior change requires a deprecation window if any caller has come to rely on it.

The cost was low: ~1 hour of work end-to-end, including reading the prior canon, sourcing the Paratext BookNames.xml schema from authoritative examples (no SIL-published DTD found — see L-013), generating the file deterministically, hosting via raw.githubusercontent.com pinned to a specific commit, and running the wire-flow smoke.

This decision is the operational reflection of L-012 from session 6: documented-behavior leads have higher epistemic status than guesses, but they are still leads — they get tested cheaply before they get baked into code.

---

## O — Observations

### O-019 — Smoke result: H-009 falsified

**Setup.**

- Live worker: `https://appbuilder-mcp.klappy.workers.dev` (commit `f0de54e` as of session start; the H-009 fixture commit `ee48d2e` does not modify any deploy code so the worker version is unchanged).
- Worker version on `/health`: `0.1.0` (unchanged from session 6).
- SAB version per smoke log: `Version 14.0`, `Build Release 129 (30-Apr 2026)` — same as session 6.
- Fixture URL (commit-pinned for auditability): `https://raw.githubusercontent.com/klappy/appbuilder-mcp/ee48d2ebf5305f8ba9a72c087711edc281e6162e/fixtures/h009/eng-web_usfm_with_booknames.zip`
- Fixture sha256: `386e0051dab7239fc5a59400948019a64f0038b3af3d40bb1ace3a73049b829c`
- Fixture composition: identical 83 `*.usfm` + 4 auxiliary files as the session-6 source bundle (sha256 `3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278`), plus a generated `BookNames.xml` at the zip root with all 83 entries populated.

**`BookNames.xml` schema confirmation.** Schema was sourced from two real-world canonical examples since neither the SIL "Building Apps" PDF §4.8 nor any document in the appbuilder-mcp canon publishes a Paratext DTD or XSD:

1. `sillsdev/machine` — `samples/data/VBL-PT/BookNames.xml` (SIL's own .NET NLP library). Commit `89406ca307b8a516caa1766d9d9ec2992a3d2888`.
2. `ethnosdev/bsb` — `database_builder/bsb_usfm/BookNames.xml` (third-party Berean Standard Bible app). Commit `0fb30b8a498b326cf807e6f21d43e8960c0c6447`.

Both agree on the structure: UTF-8 with BOM, root `<BookNames>`, child `<book code="..." abbr="..." short="..." long="..." />`, no DOCTYPE, no namespace, self-closing book elements. PDF §4.8 supplies the marker mapping: `\toc1` → long, `\toc2` → short, `\toc3` → abbreviation. `\h` is the documented secondary fallback for empty toc fields. The `build_booknames.py` generator implements exactly this and produces a deterministic output for a given input bundle.

**Wire flow.** Standard MCP streamable-HTTP transport per session 5 / session 6 evidence:

1. POST `/mcp` `initialize` → server returned `protocolVersion: 2024-11-05` and an `mcp-session-id` header.
2. POST `/mcp` `notifications/initialized` (with the session id) → 202 Accepted.
3. POST `/mcp` `tools/call submit_build` (with the session id, custom `User-Agent: appbuilder-mcp-h009-smoke/0.1` to dodge Cloudflare 1010) → returned `cached: false`, `job_id = a0ba8de192e398ab47319783003daebbf7445c44922ae8fe79ad36ba0887ae51`.
4. POST `/mcp` `tools/call get_job_status` polled every 10s → terminal at second poll.

**Payload submitted.**

```json
{
  "schema_version": "1.0",
  "name": "Web Bible (s7 BookNames)",
  "package": "org.ebible.web.s7booknames",
  "bible_source": {
    "kind": "usfm_zip",
    "url": "https://raw.githubusercontent.com/klappy/appbuilder-mcp/ee48d2ebf5305f8ba9a72c087711edc281e6162e/fixtures/h009/eng-web_usfm_with_booknames.zip",
    "sha256": "386e0051dab7239fc5a59400948019a64f0038b3af3d40bb1ace3a73049b829c"
  }
}
```

No icons, no about, no keystore (rely on bundled debug). The perturbed `name` and `package` ensured a fresh payload hash and no cache hit.

**Terminal status (verbatim from `get_job_status`):**

```json
{
  "state": "failed",
  "started_at": "2026-05-01T01:30:57Z",
  "completed_at": "2026-05-01T01:31:01Z",
  "exit_code": 1,
  "failure_mode": "hard",
  "apk_r2_key": null,
  "log_r2_key": "outputs/a0ba8de192e398ab47319783003daebbf7445c44922ae8fe79ad36ba0887ae51/org.ebible.web.s7booknames_Web_Bible_s7_BookNames_appbuilder.log",
  "human_summary": "Container: SAB exit 1, failure_mode=hard, no apk produced",
  "apk_url": null,
  "log_url": "https://appbuilder-mcp.klappy.workers.dev/r2/outputs/a0ba8de192e398ab47319783003daebbf7445c44922ae8fe79ad36ba0887ae51/org.ebible.web.s7booknames_Web_Bible_s7_BookNames_appbuilder.log"
}
```

Wall clock from `started_at` to `completed_at`: **4 seconds**, identical to the session-5/session-6 silent-exit pattern.

**Full container log (1,007 bytes, fetched from `log_url`):**

```
Detected architecture: amd64

SCRIPTURE APP BUILDER
Version 14.0
Build Release 129 (30-Apr 2026)

----------------------------------------------------------------------
Create New App Project:

App name:      Web Bible (s7 BookNames)
Package name:  org.ebible.web.s7booknames
Font:          Charis SIL Compact
Keystore:      /app-builders/debug-keystore/debug.keystore
Key Alias:     appbuilder-mcp-debug
Folder: build = /tmp/appbuilder-a0ba8de192e398ab47319783003daebbf7445c44922ae8fe79ad36ba0887ae51-zku7ytmb/build
Book filename: /tmp/appbuilder-a0ba8de192e398ab47319783003daebbf7445c44922ae8fe79ad36ba0887ae51-zku7ytmb/assets/eng-web_usfm_with_booknames.zip

----------------------------------------------------------------------
Build App:

Before building the app, please do the following:

 - Specify an App Icon in the following sizes: 72x72 (hdpi), 144x144 (xxhdpi)
 - Enter some information for the 'About' page (copyright, contact details, etc.).
 - Add one or more books for book collection 1.
```

**Closure rule application.** Per session-6 §H-009 and the session-7 prompt:

> *state="failed" AND the message still contains "Add one or more books for book collection 1": hypothesis FALSIFIED.*

The terminal log contains that literal string (final bullet). Therefore: **H-009 FALSIFIED.**

**Disambiguation of the icon/about complaints.** The smoke log contains two additional complaints not reported in session 6's evidence ("Specify an App Icon..." and "Enter some information for the 'About' page..."). These are not new behavior — they are the predictable consequence of submitting with no `icons` and no `about_url` fields. Session 5's attempt 2 already showed SAB acknowledging both inputs when supplied. They are independent of H-009, do not change the H-009 disposition, and do not represent a regression. The session-6 worked example used the priming-mirror payload that supplied both fields; this session used the minimum payload to keep the variable surface narrow. The book-collection-1 complaint is the only signal that matters for H-009, and it is unchanged.

### O-020 — Container materializes the bundle correctly; SAB reads it; SAB still rejects it

The log's `Book filename:` line confirms the container fetched the fixture from raw.githubusercontent.com, materialized it under the scratch directory as `eng-web_usfm_with_booknames.zip`, and handed the path to SAB. SAB then printed the project-creation banner without complaint about the bundle itself, and only at `-build` time refused. This is exactly the same handoff shape as session 6's smoke — the container side is doing its job; the failure is internal to SAB's collection-1 population step, and it is unaffected by the presence of `BookNames.xml`.

This rules out a class of "the container is corrupting the bundle" theories that would otherwise be live. The bundle is intact, SAB sees it, SAB rejects it. Whatever SAB v14.0 build 129 wants from a bundle to count its books toward collection 1, it is **not** `BookNames.xml`.

### O-021 — `payload_hash` equals `job_id`; cache miss confirmed

`payload_hash` and `job_id` are identical (`a0ba8de1...`), confirming the convention noted in `src/index.ts` and the cache-key derivation. `cached: false` in the `submit_build` response means the perturbed `name`/`package` produced a fresh hash and the smoke exercised the full container dispatch path — not a stale-cache hit from session 6. The terminal evidence is therefore from a real container run, not from a replay.

---

## L — Lessons

### L-013 — Falsification preserves canon; speculation degrades it

H-009 was the highest-probability hypothesis we could derive from the SIL PDF without consulting Chris Hubbard. It came directly from a documented behavior (PDF §4.8: "the first place SAB will look for the book names is in the BookNames.xml file"), it was framed as a fallback-that-no-longer-falls-back regression in build 129, and it was cheap to test. The test returned negative.

What this clears from the active hypothesis space:

- Whatever SAB v14.0 build 129 needs to populate book collection 1, it is not `BookNames.xml` alone.
- The PDF §4.8 fallback path is *not* the right axis to investigate further. Generating `BookNames.xml` with valid `code`/`abbr`/`short`/`long` for all 83 books changed nothing.
- A hypothetical container-side auto-generation of `BookNames.xml` (the path #1 we deferred) would have been wasted code — D-018 protected the codebase from a silent dead-feature.

What it does **not** clear:

- Whether some *other* file expected by SAB (a `.appBooks` serialization per PDF §15.4.2, a project metadata file, a SQLite or JSON registry written during the GUI's "Add Books" flow) is the missing piece. The PDF documents the GUI's "Add Books" affordance but does not document the on-disk artifacts it produces — and the CLI has no documented analogue.
- Whether SAB v14.0 build 129 silently changed the `-b <usfm-zip>` semantics relative to earlier builds. Without a comparison build (v13 or v14 build < 129), we cannot empirically date the regression.

The lesson generalizes: **a falsified hypothesis that costs a fixture commit and a 4-second smoke is a profitable trade.** It eliminates a class of solutions cheaply and credibly. The cost of *not* falsifying — letting H-009 sit unresolved while we speculated about subsequent moves — would have been larger and would have introduced bias into H-008's framing (every question to upstream would have been pre-shaped by the assumption that BookNames.xml was the answer).

L-012 (sessions 6) ranked hypothesis classes by epistemic status: documented-behavior > documented-absence > behavioral-delta-guess > speculation. L-013 is the corollary on the *closure* side: **a documented-behavior hypothesis that fails empirically tells you the documented behavior is incomplete, not that the documentation is wrong.** PDF §4.8 is still correct — it just doesn't describe everything SAB v14.0 build 129 needs. The gap is in what's *unwritten* about SAB's `-new` mode behavior, and that gap is precisely H-008's territory.

### L-014 — Schema sourcing without an authoritative DTD is a citation problem, not a guessing problem

The Paratext BookNames.xml format has no published DTD/XSD that I could find via canon search, the SIL Building Apps PDF (197 pages, 4 mentions of `BookNames.xml`, no schema), or open web search. What does exist is a large corpus of real-world `BookNames.xml` files in scripture-related repositories — many of them under SIL's own GitHub organization (`sillsdev/machine`) or otherwise authoritative.

The discipline applied: pick *two* independent canonical examples, confirm they agree on element/attribute names, capitalization, and structural conventions (BOM, self-closing tags, no namespace), and cite the specific commits used. The generator's docstring records both citations; the fixture's `README.md` re-cites them; this encoding closes the loop. If the format ever changes, the citation chain points to the exact commits that were the basis of our reading at the time.

This is a different discipline from "do not guess": the schema is empirical canon, not stipulated canon. The honest description is "we observed two SIL/SIL-adjacent files agreeing on this shape" rather than "we know the schema." For hypothesis-test purposes, that's sufficient. For a production-grade auto-generator (the deferred path #1 fix), we would want a third confirmation — preferably an actual file produced by Paratext itself rather than a downstream consumer — before relying on the schema.

### L-015 — The smoke harness pattern from session 5 reproduces cleanly with no modification

The session-5 mitigations (custom `User-Agent` to dodge CF 1010, capture `mcp-session-id` from `initialize` response headers, send `notifications/initialized` before `tools/call`, accept either `application/json` or `text/event-stream` in responses) were sufficient and necessary to drive the live Worker from a fresh Python script. The smoke harness for this session is in `/home/claude/smoke_h009.py` — not committed because it is not a deploy artifact, but the pattern is fully described above and would take ~30 minutes to recreate from scratch using just the session-7 encoding.

If a future session needs a recurring smoke, the harness is a candidate for promotion to `scripts/smoke.py` — but only if the recurrence is real. Premature scripting is its own waste.

---

## C — Constraints

### C-009 — `fixtures/` directories are diagnostic-only and have no contract

The `fixtures/h009/` directory committed in this session (and any peer `fixtures/h-N/` directories future sessions create) is an empirical-test artifact, not a deploy asset. No source code references it; no agent contract depends on it. It is permitted to live in the repo for auditability of the hypothesis test that produced it, but it can be deleted at any future cleanup pass without coordination.

If a fixture's content turns out to be the basis of a permanent contract (for example, if a `fixtures/test-bundle/` becomes the canonical input for an integration smoke), its location and lifetime contract are upgraded explicitly via a separate canon edit — it does not become a contract by accumulation.

This constraint exists because path #2 (this session's choice) accepts a small amount of repo clutter as the cost of in-place auditability. Without C-009, that clutter compounds; with C-009, it has a known disposition.

---

## H — Handoffs status update

### H-009 — CLOSED (falsified)

Test ran 2026-05-01T01:30:57Z → 01:31:01Z. Bundle with generated `BookNames.xml` produced the same `Add one or more books for book collection 1` complaint. Hypothesis is wrong. No further action under H-009.

### H-008 — UNCHANGED, REMAINS THE NEXT MOVE

The H-009 falsification leaves H-008 as the active route: ask Chris Hubbard / SIL what we are missing. The session-6 refinement to H-008 ("include the BookNames.xml hypothesis explicitly in the question") can now be tightened further:

> Given image `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`, SAB v14.0 build 129, and the SIL priming bundle `eng-web_usfm.zip` (sha256 `3c34cb69...`): what flag, file, or import step does the CLI need so that `-b <zip> -build` registers books with collection 1? We tested the documented PDF §4.8 BookNames.xml fallback hypothesis empirically (`fixtures/h009/`, smoke job_id `a0ba8de1...`) — adding a well-formed `BookNames.xml` did not change the outcome. The complaint persists.

Materials to share with Chris (in addition to session-6's existing list):

- The new fixture: `https://raw.githubusercontent.com/klappy/appbuilder-mcp/ee48d2ebf5305f8ba9a72c087711edc281e6162e/fixtures/h009/eng-web_usfm_with_booknames.zip`
- The smoke result above (O-019 in this file)
- The generator: `fixtures/h009/build_booknames.py`

### H-002 — UNCHANGED, ACTIVE

The first-end-to-end APK still has not been produced. H-002 closes with H-008 once we know what to add to the bundle. No new code change in this session.

### Open-011 — UNCHANGED, ACTIVE

The "book-collection-1 unblock" open item stays open. Its closure is gated on H-008.

---

## Updated ID continuity through session 7

- **D**: D-001..D-018
- **O**: O-001..O-021
- **L**: L-001..L-015
- **C**: C-001..C-009
- **H**: H-001 (closed s4), H-002 (active), H-003 (active), H-004 (closed s1), H-005 (superseded s4), H-006 (closed s5), H-007 (closed s6), H-008 (active, narrowed s7), H-009 (closed s7, FALSIFIED)
- **Open**: Open-005 (closed s3), Open-006 (active), Open-007 (active), Open-008 (active), Open-009 (active), Open-010 (closed s6), Open-011 (active), Open-012 (active), Open-013 (active)

Session 8 continues at D-019, O-022, L-016, C-010, H-010, Open-014 if new items emerge.

---

## Recommended next-session starting point (separate work item)

Two parallel tracks, both unlocked by H-009's closure:

1. **H-008 outreach.** Compose the question to Chris Hubbard / SIL using the materials list above and the tightened framing. This is the highest-leverage move — one external question may be the difference between weeks of speculation and a one-line container fix.

2. **Durable container fallback (deferred, NOT for H-008's response window).** When (and only when) H-008 returns an answer that names the missing artifact, the container can be modified to auto-generate or auto-include it from a USFM zip that lacks it — making the MCP self-sufficient against the SIL priming-bundle shape. This is a **session-8 or later** work item, gated explicitly on H-008's resolution. Per D-018's reasoning, do not pre-build it on speculation.

Neither track involves another H-009-style empirical guess. The cheap-test budget for the BookNames.xml axis is spent; the next-cheapest move is upstream consultation, not another fixture commit.
