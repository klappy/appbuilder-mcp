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

---

## Continuation — 2026-05-01T01:45Z pivot to upstream-test reverse-engineering

The operator pushed back on the "go ask Chris" disposition with one obvious move I had failed to surface: search upstream SIL repositories for working test fixtures and reverse-engineer the missing input. This continuation captures that work and lands a much sharper hypothesis than H-008 was framed to ask.

### D-019 — Upstream-evidence reading before another guess

When H-009 falsified, the cheapest remaining move was *not* outreach but *one more pass through publicly available upstream artifacts*. Three upstream repositories, all under the `sillsdev` and `sil-car` orgs, give a direct read on what a working SAB build expects — without needing Chris Hubbard's time. D-019 chose this path before any H-008 outreach.

Specifically inspected:
- `sillsdev/docker-appbuilder-agent` (we had already cited this for the priming bundle, but had not surveyed all of `ansible/roles/app-builders/files/`)
- `sillsdev/appbuilder-buildengine-api` (the production SIL build engine — REST API + AWS CodeBuild orchestration)
- `WycliffeAssociates/AudioSABbuilder` and `sil-car/sango-transition-guide-app` (real `.appDef` examples in the wild)

### O-022 — The SIL production build path does not use `-new -b` at all

The decisive finding is in `sillsdev/appbuilder-buildengine-api/scripts/upload/default/build.sh`. The `build_apk()` function — the canonical production SAB invocation that has been building real Scripture apps for years — calls SAB exactly like this:

```
$APP_BUILDER_SCRIPT_PATH -load build.appDef -no-save -build \
    -ks ${KS} -i ${SECRETS_DIR}/keys.txt \
    -fp apk.output=${OUTPUT_DIR} \
    -vc ${VERSION_CODE} -vn ${VERSION_NAME} \
    ${SCRIPT_OPT}
```

Note what is **not** present:
- `-new` is not used. Production never creates projects on the fly.
- `-b <bible-zip>` is not used. Books are not passed as a CLI argument.
- `-n <app-name>` and `-p <package>` are not used. They live inside the `.appDef`.

What `prepare_appbuilder_project()` does upfront:
1. Verifies exactly one `*.appDef` file exists in the project directory.
2. Renames it to `build.appDef`.
3. Renames the matching `<name>_data/` directory to `build_data/`.
4. Reads `<package>`, `<version>`, etc. directly from the `.appDef` XML.

The input to a real SIL build is **a complete pre-built SAB project** — a `<name>.appDef` XML file plus a `<name>_data/` directory tree. The build engine clones this whole project from a per-app git repository and runs `-load build.appDef -build`.

### O-023 — A real `.appDef` carries the book-collection contents inline

`WycliffeAssociates/AudioSABbuilder/resources/bible.appDef` (201 KB) and `sil-car/sango-transition-guide-app/Sango Transition Guide.appDef` both confirm the schema: book collections are an XML element directly inside `<app-definition>`, not derived from the bible files.

The relevant element name is `<books id="C01">` (sequentially numbered: `C01`, `C02`, ... — "C01" is "book collection 1"). Each `<book>` child is fully specified:

```xml
<books id="C01">
  <book-collection-name>Main Collection</book-collection-name>
  <features type="bc">...</features>
  <metadata>...</metadata>
  <styles-info>...</styles-info>

  <book id="GEN">
    <name>Genesis</name>
    <abbrev>Gen</abbrev>
    <group>OT</group>
    <sub-group>Pentateuch</sub-group>
    <filename>01-GEN.usfm</filename>
    <source>/home/dan/Downloads/b1cdb05baa.zip</source>
  </book>
  <!-- ... one <book> entry per book ... -->
</books>
```

The `sango-transition-guide-app` example confirms the same structure with a single book (`<book id="XXA"><filename>94XXAGTSag.SFM</filename>...</book>`). The actual SFM/USFM file lives at `<project>_data/books/<filename>` on disk.

The CLI error `"Add one or more books for book collection 1"` is now exactly readable: it means the `<books id="C01">` element in the project's `.appDef` has zero `<book>` children. Whatever is supposed to put `<book>` children there in `-new` mode either didn't run or didn't find what it needed.

### O-024 — Two priming bundles, both with `-build` priming commented out

`sillsdev/docker-appbuilder-agent/ansible/roles/app-builders/files/` contains **two** priming bundles, not one:

- `eng-web_usfm.zip` — the bare USFM bundle we already know (sha256 `3c34cb69...`).
- `eng-bsb_usx.zip` — a **proper DBL Text Release Bundle** with a different shape entirely: `metadata.xml` at root + `release/USX_1/<BOOK>.usx` + `release/eng_en.ldml` + `release/styles.xml` + `release/versification.vrs`. 70 files, 9.3 MB.

The Ansible playbook (`tasks/main.yml`) has both priming `shell:` tasks **commented out**, in both cases. The commented-out commands use the `-new -b ... -build` pattern (the eng-web one omits `-build`; the eng-bsb one uses `-build-modern-pwa`). Per session-5 L-007, neither was ever empirically known to build successfully — they exist as cache-warming fixtures, not as proven workflows.

The DBL bundle (`eng-bsb_usx.zip`) is interesting because PDF §4.8 explicitly distinguishes DBL bundles (which carry `metadata.xml`) from raw USFM (which carries `BookNames.xml` or `\toc` markers). It is plausible — though not yet tested — that `-new -b <dbl-zip>` works while `-new -b <usfm-zip>` does not.

### O-025 — There is no upstream CI test that actually runs a SAB build

The `sillsdev/docker-appbuilder-agent/.github/workflows/main.yml` builds and pushes the Docker image to GHCR, ECR, and AWS, but **runs no functional test**. There is no upstream "given fixture X, run SAB, assert APK appears" test in any repo I inspected. The production build engine (`appbuilder-buildengine-api`) has unit tests for its TypeScript orchestration layer, but the actual SAB invocation is exercised only against real customer projects in real AWS CodeBuild runs.

This explains why the `-new -b` regression (if that's what it is) has gone uncaught: nothing tests it. The production path uses `-load build.appDef`, which works. The `-new -b` documented-CLI path that the appbuilder-mcp v1 spec assumed is empirically untested in any SIL CI surface.

---

## L — Lessons (continuation)

### L-016 — "Documented" does not mean "tested" — verify both axes

The PDF §4.14 page-38 worked example (`sab -new -n "..." -b MyBookBundle.zip -f "Charis SIL Compact" -i keys.txt -build`) reads as authoritative. It is the only documented end-to-end CLI invocation in the entire 197-page manual. Sessions 1–6 took it as the contract.

The SIL production system does not exercise that contract. It uses a strictly different invocation (`-load build.appDef -build`). No CI in any inspected SIL repository tests the `-new -b -build` path. The PDF documentation is therefore *aspirational* with respect to the reality of how SAB is currently exercised — possibly correct, possibly stale, but not verified by any test we can read.

The lesson generalizes: **when relying on documented behavior, inspect whether the behavior is empirically tested somewhere upstream.** If not, the document is a hypothesis, not a contract. The `appbuilder-buildengine-api/scripts/upload/default/build.sh` is the *empirical* SAB contract, and it differs materially from the PDF.

This sharpens L-007 (sessions 5: "documentation > convenient examples") with a corollary: **documentation needs to be triangulated against working production examples.** When the two diverge, the production example is the live contract and the documentation is the unverified theory.

### L-017 — A test you can read is worth a question you have to ask

The session-6 H-008 framing ("ask Chris Hubbard / SIL") was the right disposition *given the assumption that we had exhausted upstream evidence*. We hadn't. Three upstream repositories — all public, all already implicitly cited in our canon — together pin the actual SAB input contract more tightly than any single round-trip with Chris would have. The cost was ~40 minutes of cloning, grepping, and reading; the benefit is a sharply-narrowed H-010 that makes any future Chris question one-line and answerable.

The discipline: **before queuing a question to a human, exhaust the public artifacts that human is likely to point you back to.** Upstream tests, real-world examples, production scripts, and CI configurations are the same evidence Chris would use to answer — except they are read-once-by-anyone rather than read-once-and-answered-by-Chris. Bottleneck respect cuts both ways: the operator's attention is finite, but so is upstream maintainers'.

---

## H — Handoffs (continuation)

### H-009 — REMAINS CLOSED

H-009's falsification is not retroactively undone by these new findings. The `BookNames.xml` test ran honestly, the result was negative, and the fixture commit + smoke evidence stands. What the new findings change is the *successor* hypothesis space: H-008 narrows from "ask SIL" to "test the alternative invocation paths," and a new H-010 enters the active set.

### H-008 — NARROWED FURTHER (now optional, not blocking)

The previous session-7 framing of H-008 ("ask Chris Hubbard / SIL what we are missing") is now optional rather than blocking. If H-010 (below) closes by either testing path, H-008 reduces to a courtesy note rather than a dependency.

The H-008 question, if asked, can be much sharper:

> We see that production SIL builds invoke SAB as `-load build.appDef -build` against a pre-built `.appDef` + `_data/` project, and that no public CI exercises the `-new -b <bible-zip> -build` form documented on PDF page 38. In SAB v14.0 build 129, does the `-new -b` form still produce a project where `<books id="C01">` is auto-populated? Or has that path become advisory-only, with `-load <name>.appDef` the only supported build entry point?

### H-010 — NEW: Test alternate inputs to the existing CLI surface

Three sub-hypotheses, listed in increasing implementation cost. Each is independently testable. Recommend testing in order; first to confirm forms the basis of the durable container fix.

**H-010a (cheapest — single-smoke test).** The DBL bundle `eng-bsb_usx.zip` (already in `sillsdev/docker-appbuilder-agent` priming files, well-formed with `metadata.xml` + `release/USX_1/*.usx` + `release/styles.xml` + `release/versification.vrs` + `release/eng_en.ldml`) may build with `-new -b <dbl-zip> -build` even though the bare USFM bundle does not. PDF §4.8 explicitly documents that DBL bundles use `metadata.xml` as the book-name source. If `-new` mode in build 129 only supports DBL/USX inputs and silently ignores plain USFM zips, this test confirms it.

- Cost: one fixture commit (~9 MB DBL bundle) + one smoke. ~30 minutes.
- Confirms: `kind: "usx_zip"` is the working input, `kind: "usfm_zip"` is broken.
- Falsifies: same complaint persists → both inputs broken in `-new` mode → escalate to H-010b.

**H-010b (medium — two-fixture test).** Build a minimal `.appDef` + `_data/` project structure programmatically from the existing eng-web USFM bundle. Specifically: generate a `eng-web.appDef` that contains `<package>org.ebible.web</package>`, `<app-name>Web Bible</app-name>`, and a `<books id="C01">` populated with one `<book>` per USFM file (each `<book>` having `<id>`, `<name>`, `<abbrev>`, `<filename>`); place the `.usfm` files under `eng-web_data/books/`. Re-zip the whole project and submit with the existing payload schema (it already accepts arbitrary zip contents at `bible_source.url`).

- Cost: rewrite the BookNames.xml generator into a `.appDef` generator (~1–2 hours), one fixture commit, one smoke.
- Confirms: `-new -b <project-zip>` is fundamentally not the path; `-load build.appDef` is.
- Implication: container code change to invoke `-load <project>.appDef -build` instead of `-new -b <bible> -build` when the input zip looks like a project rather than a raw bible bundle. Significant durable change — out of scope for this session under D-018 reasoning, but cleanly scoped for a session-8 work item.

**H-010c (highest — full container-side fallback).** Container auto-converts any incoming `usfm_zip` to a synthesized `<project>.appDef` + `<project>_data/` skeleton on the fly, so the agent contract (still accepts a USFM zip) remains stable while the under-the-hood SAB invocation switches to the production-proven `-load` path. This is the durable fix that closes Open-011 cleanly.

- Cost: container code + tests + redeploy. Probably a full session-8.
- Pre-requisite: H-010b must confirm that `-load <project>.appDef -build` works against a synthesized project. Otherwise H-010c is building on speculation again.

**Recommended sequence.** H-010a first (single smoke, no container change, ~30 minutes). If H-010a confirms that DBL bundles work under `-new`, the answer for v0.x users with USFM-only data is "convert your USFM to a DBL bundle, or wait for H-010c," and H-010b becomes lower priority. If H-010a falsifies (both inputs broken under `-new`), H-010b is the next move.

### H-002 — UNCHANGED, ACTIVE

Still gated on producing a real APK. Closes when H-010 (any sub-letter) closes positive.

### Open-011 — UNCHANGED, ACTIVE

Still the umbrella "book-collection-1 unblock" item. Closes with H-010.

### New: Open-014 — Document the `-new -b` vs `-load .appDef` distinction in canon

The PDF §4.14 documents `-new -b` as if it were the canonical CLI path. The empirical SIL production system contradicts this. `canon/articles/cli-reference.md` and `canon/articles/book-collections.md` should both be amended (in a future session) to: (a) document `-load <project>.appDef -build` as the production-proven path, (b) clearly mark `-new -b` as documented-but-not-empirically-verified-in-build-129, (c) reference the upstream evidence (`appbuilder-buildengine-api/scripts/upload/default/build.sh` and the `WycliffeAssociates/AudioSABbuilder` / `sil-car/sango-transition-guide-app` `.appDef` examples).

This is an Open and not a D because the right place to land these edits is after H-010 closes — the article's stable form depends on which sub-letter wins.

---

## Updated ID continuity through session-7 continuation

- **D**: D-001..D-019
- **O**: O-001..O-025
- **L**: L-001..L-017
- **C**: C-001..C-009
- **H**: H-001 (closed s4), H-002 (active), H-003 (active), H-004 (closed s1), H-005 (superseded s4), H-006 (closed s5), H-007 (closed s6), H-008 (active, narrowed s7 cont., now optional), H-009 (closed s7, FALSIFIED), H-010 (new s7 cont., active, three sub-letters)
- **Open**: Open-005 (closed s3), Open-006 (active), Open-007 (active), Open-008 (active), Open-009 (active), Open-010 (closed s6), Open-011 (active), Open-012 (active), Open-013 (active), Open-014 (new s7 cont., active)

Session 8 continues at D-020, O-026, L-018, C-010, H-011, Open-015 if new items emerge.
