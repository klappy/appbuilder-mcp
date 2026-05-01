---
uri: klappy://canon/encodings/transcript-encoded-session-6
title: "Session 6 — Capacity Bump, ESE Phase A, Book-Collections Promotion"
audience: "next-session-claude | maintainer | operator"
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "encoding", "session-6", "dolcheo", "ese", "h-007-closed", "h-008-new", "book-collections"]
canonical_status: non_canonical
date: 2026-04-30
session_window: "2026-04-30T22:47Z – 2026-04-30T23:??Z"
governs: "the session-6 work: capacity ceiling fix, first ESE surface over the SAB Building Apps PDF, promotion of book-collections.md as canon"
companion_to:
  - "canon/encodings/transcript-encoded-session-5.md"
  - "canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md"
  - "canon/articles/book-collections.md"
applied_canon:
  - "klappy://canon/methods/epistemic-surface-extraction"
  - "klappy://canon/principles/dry-canon-says-it-once"
  - "klappy://canon/principles/maintainability-one-person-indefinitely"
  - "klappy://odd/encoding-types/decision"
  - "klappy://odd/encoding-types/observation"
  - "klappy://odd/encoding-types/learning"
status: working
---

# Session 6 — Capacity Bump, ESE Phase A, Book-Collections Promotion

> Session 6 began with H-007 (observe redeploy of session-5's CLI-bug fix) and H-002 (first APK lands) both active. It surfaced a new failure mode (`max_instances=2` capacity ceiling), bumped the limit to 10, observed that the deploy was live (filename hypothesis from session 5's e2b5067 took effect, banner now preserves `eng-web_usfm.zip`), but found the underlying "no books for book collection 1" complaint persists. The session pivoted to seeding canon: applied Epistemic Surface Extraction to the SIL Building Apps PDF (Phase A: 17 of 197 pages), promoted a new canon article on book collections, and prepared an upstream question to Chris Hubbard / SIL.

---

## Session arc

The session opened with a clone-and-survey pass: the repo was substantially more developed than session 6's pre-clone planning had assumed (5 commits, full v1 spec, six-tool surface, 5 prior session encodings). A reality reset followed: the v0.1 plan I'd drafted in /mnt/user-data/outputs was superseded by the operator's prior-session execution. The right move was to read, not write — adapt to existing reality.

The first concrete action was a re-smoke of WEB USFM against the live deploy (carrying H-007). The smoke surfaced a capacity ceiling — `max_instances=2` plus session-5's two stuck containers within the 60m sleepAfter window blocked any new Container start with HTTP 500. I reverted to planning, named the unknown ("bump or wait?"), and the operator chose bump-to-10. After committing the change and rebasing onto a parallel commit (`e2b5067`, the filename-preservation hypothesis from the same window), the redeploy succeeded and a fresh smoke ran.

The fresh smoke validated two things and disproved one:
- `max_instances=10` unblocked the queue (capacity available).
- The filename preservation took effect (banner now reports `Book filename: …/assets/eng-web_usfm.zip` instead of the synthetic `bible.usfm.zip`).
- Yet SAB v14.0 build 129 still complained: `Add one or more books for book collection 1`. Filename was not the cause.

This put us at the same blocker session 5 left, but with two hypotheses ruled out. Per the operator's instruction, the next move was not to keep guessing — it was to apply Epistemic Surface Extraction to the SIL Building Apps PDF and seed canon and docs from it. That occupied the second half of the session.

---

## D — Decisions

### D-013 — Bump `max_instances` 2 → 10

The original `max_instances: 2` in `wrangler.jsonc` was a conservative guess made in session 1 without empirical cost data (per the inline comment "v0.1 sets max_instances=2 for cost control"). It produced a hard ceiling that blocked back-to-back smoke attempts within the 60-minute `sleepAfter` window: session 5's two failed builds occupied both slots, and session 6's first re-smoke hit HTTP 500 "Maximum number of running container instances exceeded."

Cloudflare Containers bills running-instance-seconds, not the provisioned ceiling, so a higher `max_instances` costs nothing while idle and unblocks iteration. The bump to 10 is operator-directed and trivially reversible if costs surprise.

**Authority.** Operator directive in this session. Comment in `wrangler.jsonc:51-66` updated to reference this entry. Closes **Open-010**.

### D-014 — Epistemic Surface Extraction methodology adopted for upstream docs

Operator directed using oddkit's ESE method (`klappy://canon/methods/epistemic-surface-extraction`) with progressive disclosure and DOLCHEO encoding to seed appbuilder-mcp's docs and canon from upstream artifacts (starting with the SIL Building Apps PDF). This decision establishes that:

- Upstream artifacts (PDFs, etc.) are surfaced as sidecar files (`<name>.surface.json` + `<name>.surface.md`) under `canon/surfaces/`.
- Surfaces are interpretive and non-canonical; they illustrate but do not instruct (containment clause is mandatory).
- Durable insights from a surface are promoted via separately-authored canon edits (new articles or extensions to existing ones) — not by referencing the surface as authority.

**Authority.** Operator directive this session. Codified in `canon/surfaces/README.md` (the directory README) and exemplified in `canon/articles/book-collections.md` (the first promotion).

### D-015 — Promote `book-collections.md` as canon

The Phase A surface revealed a durable insight worth canonizing: the mental model of Book Collections, the GUI vs CLI population paths, and the v14.0-build-129 behavioral gap. Per ESE §Promotion Rule, the surface itself does not become canon — a separately-authored article does.

**Authority.** ESE §Promotion Rule. The article cites the PDF's pages 18, 36-38, 129-131 directly as authority; it does not reference the surface artifact as authority for its claims. The article carries `canonical_status: non_canonical` (consistent with sibling articles) but is structurally canon-shaped and lives in `canon/articles/`.

### D-016 — Phase the ESE work; do not attempt all 197 pages in one session

197 pages × 3-5 bullets each is several hours of careful work. Phase A targets the immediate-need pages (file prep §1.1, GUI walkthrough §2, CLI §4.14, Book Collections §15.1) — 17 pages, sufficient to fully answer the H-002 blocker question. Phase B (the remaining 180 pages) is deferred to subsequent sessions and tracked as **Open-012**.

---

## O — Observations

### O-011 — Carries from session 5 (H-006 closed)

H-006 (`/health` returns 200 with 6 tools) was closed in session 5 by O-011. No change.

### O-012 — Carries from session 5 (H-002 first attempts)

Session 5's two failed smoke attempts (`8f085fe6...`, `18150dec...`) carry forward as historical evidence. No new action.

### O-013 — Carries from session 5 (PDF retrieval)

Session 5's PDF retrieval at sha256 `49dc27a3...` is the same artifact this session re-fetched and surfaced. The sha256 round-tripped from session 5's local computation, validating L-008 (compute hashes locally).

### O-014 — Re-smoke after `max_instances` bump and `e2b5067` rebase

A fresh `submit_build` (job_id `0b496bcc92a3c5d5adb97dcc82ba4a83d40612c42836b3fa86c4daca0369317a`) was submitted at 22:59:13Z to a deploy that included three changes: e673e4f (session-5 CLI fixes), e2b5067 (filename preservation), and a9bb52b (max_instances bump). Container started immediately (capacity available). SAB v14.0 build 129 (today's release) ran. State terminal at 22:59:19Z, 4-second wall-clock, exit code 1, failure_mode hard.

The build log shows:
- All payload parameters echoed correctly in the "Create New App Project" banner, including `Book filename: /tmp/.../assets/eng-web_usfm.zip` (preserved name — confirms e2b5067 active).
- `Build App:` section reports three complaints: missing app icons (expected — minimum payload supplied none), missing About page text (expected — minimum payload supplied none), and **`Add one or more books for book collection 1`**.

The third complaint is the same one session 5's smoke4 (full payload, with about + 2 icons + keystore) surfaced. The complaint does not depend on the absent icons or about; it is a separate, independent assertion that book collection 1 is empty.

**Filename hypothesis disproven.** Session 5's e2b5067 commit message explicitly framed the filename change as "a HYPOTHESIS, not a confirmed cause" and committed to surfacing rather than guessing if it didn't resolve the issue. It didn't, and we surface.

### O-015 — Phase A ESE surface produced

`canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.json` and `.surface.md` written. Conforms to ESE §Invariant Contract:

- Artifact registration: title, format, URL, sha256 (`49dc27a3...`), byte size, page count, attribution (Richard Margetts, SIL), creation date (2026-03-26), license note, intent, canonical_status `interpretive_non_canonical`.
- Segmentation: PDF, page-as-unit, page_number anchor, 17 pages in Phase A (14-22, 36-38, 129-134), 180 pages pending Phase B.
- Per-segment: 3-5 observational bullets, short quotes (≤25 words each, verified), cross-refs to existing canon (`illustrates` to payload-construction.md and bundled-debug-keystore.md; `compresses` to cli-reference.md; `extends` to payload-construction.md for the new book-collection mechanics).
- Containment clause present and mandatory-shaped per ESE template.
- Provenance records pypdf 5.9.0 as the extractor and this encoding as the session reference.

### O-016 — PDF p37-38 CLI table is exhaustive in form, exhausted in content

The CLI option table on PDF page 37-38 lists every documented flag: `-new`, `-load`, `-build`, `-no-save`, `-?`, `-n`, `-p`, `-b`, `-i`, `-a`, `-f`, `-ic`, `-l`, `-ft`, `-vc`, `-vn`, `-ks`, `-ksp`, `-ka`, `-kap`, `-fp`. **No flag named `-bc`, `-collection`, `-add-books`, or any analogue exists in the documented surface.** The page-38 worked example asserts that `sab -new -n ... -p ... -b <zip> -f <font> -i <keys> -build` produces a built APK from one `-b`. Our smoke does this exactly and SAB v14.0 build 129 still reports the collection empty. The documented surface is exhausted; the next move is upstream (H-008).

---

## L — Learnings

### L-009 — Filename preservation was not the cause of "book collection 1 empty"

Session 5's e2b5067 committed the filename-preservation change as a careful hypothesis: SAB might use filename heuristics in `-b` content sniffing, since the priming script materializes the bundle under `eng-web_usfm.zip` while our container was renaming to `bible.usfm.zip`. The change took effect (O-014 banner confirms) but the underlying complaint persisted.

**Generalization.** When a complaint takes the form "X is empty" after an input X has been declared by all visible signals (the parameter banner echoes the path, the content is well-formed, the documented flag is correct), the next hypothesis is not filename-shaped. It is either a flag we're missing, a format requirement we're misreading, or an upstream regression. Session 5's commit message anticipated this discipline ("the next move is to surface to operator rather than continue guessing"); session 6 honored it.

### L-010 — Some upstream answers are not in the upstream docs

The PDF is the authoritative documentation for SAB. The PDF documents that one `-b <zip>` populates the new app's default Book Collection such that `-build` succeeds. SAB v14.0 build 129 demonstrably does not exhibit that behavior on a well-formed USFM zip in the priming-script style. **The PDF's documented surface and the binary's actual behavior diverge.** This is not a documentation problem we can read our way out of; it's a question that requires upstream domain knowledge.

**Generalization.** Documentation is necessary but not sufficient for verification. When documented behavior contradicts observed behavior, the operating posture is "name the gap, ask upstream, do not infer a workaround." Inferring a workaround from documentation that doesn't match reality is L-007 (auth docs > convenient examples) generalized: even auth docs can lag behind binary reality.

### L-011 — ESE's promotion rule prevents accidental canonization

The ESE method explicitly forbids promoting surface bullets into canon:

> Surfaces can inform canon edits, but: Artifacts do not become canon. Only separately authored canon changes can be promoted. — `klappy://canon/methods/epistemic-surface-extraction` §Promotion Rule

In practice, this meant writing `book-collections.md` as a fresh article that *cites the PDF* (page 129, 130) as authority — not as an article that quotes the surface as authority. The surface remains a navigation/awareness layer; the article is the canon. This separation lets the surface evolve (Phase B will add 180 more pages) without that evolution churning canon.

**Generalization for this repo.** Whenever a `canon/surfaces/*.surface.{json,md}` reveals a durable insight, the canon edit must cite the upstream source directly. The surface is for discoverability and search; the canon is for authority.

---

## C — Constraints (one new)

### C-007 — Surface artifacts in `canon/surfaces/` are interpretive and non-canonical

Codified in `canon/surfaces/README.md`. The constraint:

- Every file under `canon/surfaces/<name>.surface.{json,md}` is a non-canonical sidecar.
- Every surface MUST include a containment clause.
- Surfaces inform canon edits but do not become canon.
- The PDF (or other upstream artifact) is the authority; the surface is the navigation layer.

This constraint mirrors the upstream method but localizes it to this repo's directory layout.

---

## H — Handoffs

### H-002 — STILL ACTIVE (first APK lands)

Carries forward unchanged. The capacity ceiling is no longer a blocker (D-013), the filename hypothesis is disproven (L-009), the deploy is observed live (H-007 below). The remaining blocker is the "book collection 1 empty" complaint, which is now Open-011 pending upstream resolution via H-008.

### H-007 — CLOSED: Workers Builds redeploy of session-5 commits observed live

Closed by O-014. The redeploy of `e673e4f` (session-5 CLI fixes) and `e2b5067` (filename preservation) and `a9bb52b` (max_instances bump) was confirmed live by the smoke-build banner reflecting all three changes' effects:

- `Build App:` section appears in the log (confirms `-build` flag is being passed → e673e4f effect).
- `Keystore:` and `Key Alias:` are echoed in the banner (confirms debug.properties is parseable → e673e4f form fix).
- `Book filename: …/assets/eng-web_usfm.zip` (confirms filename preservation → e2b5067 effect).
- Container started without HTTP 500 capacity error (confirms max_instances bump → a9bb52b effect).

H-007's original closure rule said "If the APK does not land, encode the new failure mode and revert to planning" — we did exactly that, then resumed work along the operator's revised plan (apply ESE).

### H-003 — STILL ACTIVE (telemetry-governance fresh-context review)

Carries forward unchanged.

### H-008 — NEW: Pose precise question to Chris Hubbard / SIL re `-b` and book collection 1

**One-line scope.** Send Chris (or post to SIL's appropriate channel) the exact invocation, log, image tag, and bundle sha256, and ask whether SAB v14.0 build 129 still treats `-b <usfm-zip>` as populating the default Main Collection or whether a new flag / file format / wizard equivalent is now required.

**Materials to include in the message.**

- Image tag: `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito` (digest `sha256:b59ddf6160523a22b141959a79c2bc82648693953ebf6e5b29ec2597979e499c` per session 4 D-009).
- SAB version: `Version 14.0 Build Release 129 (30-Apr 2026)` (per banner in O-014).
- Bundle: `eng-web_usfm.zip` from `https://raw.githubusercontent.com/sillsdev/docker-appbuilder-agent/master/ansible/roles/app-builders/files/eng-web_usfm.zip`, sha256 `3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278`, 83 USFM files at root with proper `\id`/`\h`/`\toc1/2/3`/`\c`/`\v` markers.
- Invocation:
  ```
  scripture-app-builder -new \
    -n "Web Bible (s6 v2 a1)" \
    -p org.ebible.web.s6smokev2a1 \
    -b /tmp/.../assets/eng-web_usfm.zip \
    -ks /app-builders/debug-keystore/debug.keystore \
    -i /app-builders/debug-keystore/debug.properties \
    -fp build=/tmp/.../build \
    -build
  ```
  where `debug.properties` contains `-ksp <pwd>\n-ka <alias>\n-kap <pwd>\n` per page 38's worked example.
- Full log (4 seconds, 24 lines): available at `https://appbuilder-mcp.klappy.workers.dev/r2/outputs/0b496bcc92a3c5d5adb97dcc82ba4a83d40612c42836b3fa86c4daca0369317a/org.ebible.web.s6smokev2a1_Web_Bible_s6_v2_a1_appbuilder.log`.
- The question: does `-b <zip>` populate the default Main Collection in SAB v14.0 build 129? If yes, what's wrong with our invocation? If no, what's the documented-or-recommended path?

**Closure rule.** When Chris (or SIL) responds, encode the answer as O-017 in the next session. If the answer reveals a flag, file format, or invocation change, encode the implementation decision as a new D entry and validate via re-smoke. If the answer reveals an upstream bug, encode and wait for the fix; consider pinning back to a known-good tag in the meantime.

**Rollback.** This handoff is informational; nothing to roll back.

---

## E — Externals

No new external dependencies. The PDF (`Scripture-App-Builder-02-Building-Apps.pdf`, sha256 `49dc27a3...`) was already known to canon from session 5; this session is the first to formally surface it.

---

## Open items (forward)

### Open-009 — `/health` spec drift: deploy reports `v1.3-draft`, canon says `v1.1-draft` (carries from session 5)

Source located: `src/index.ts:490` literal `"v1.3-draft"`. Fix is small (change to `"v1.1-draft"` to match canon). Deferred to a session that touches `src/index.ts` for a substantive reason; not worth a dedicated commit.

### Open-010 — CLOSED by D-013

`max_instances` bumped 2 → 10. Capacity ceiling no longer the limiting factor for smoke iteration.

### Open-011 — NEW: book-collection-1-empty root cause

The "Add one or more books for book collection 1" complaint persists across all session-5 and session-6 smoke attempts despite the filename hypothesis fix. Documented surface in the SAB Building Apps PDF is exhausted (no `-bc`/`-collection`/`-add-books` flag). Closure depends on H-008 (upstream question to Chris Hubbard / SIL).

**Priority.** P1 — blocks H-002 (first APK lands), which is the v0.1 milestone.

### Open-012 — NEW: ESE Phase B for SAB Building Apps PDF

Phase A surfaced 17 of 197 pages. Phase B should surface the remaining 180. Suggested order of priority:

1. Pages 23-35 — chapters 3 (Installing app on phone), 4 (FAQ — many sections relevant to v1.x feature work)
2. Pages 39-128 — Menu Bar through Audio Files (mostly GUI feature surface; informs v1.x-v2.x roadmap)
3. Pages 135-152 — §15.5 Configuring a book collection, §15.6 Configuring a Book (could reveal latent flags via UI affordances; relevant to Open-011 as a backup if H-008 stalls)
4. Pages 153-197 — Picture Story Books, Song Books, EPUB, appendices

**Priority.** P3 — useful for canon depth and for the `docs` MCP tool's eventual richness, but not blocking any active milestone.

### Open-006, Open-007, Open-008 (carry from session 4)

No change. Image disk-margin, agent-stg → agent-prd promotion, single-platform amd64 manifest.

---

## ID continuity through session 6

- **D**: D-001..D-016
- **O**: O-001..O-016
- **L**: L-001..L-011
- **C**: C-001..C-007
- **H**: H-001 (closed s4), H-002 (active), H-003 (active), H-004 (closed s1), H-005 (superseded s4), H-006 (closed s5), H-007 (closed s6), H-008 (new s6, active)
- **Open**: Open-005 (closed s3), Open-006 (active), Open-007 (active), Open-008 (active), Open-009 (active), Open-010 (closed s6 by D-013), Open-011 (new s6, active), Open-012 (new s6, active)

Session 7 continues at D-017, O-017, L-012, C-008, H-009, Open-013 if new items emerge.

---

## What session 7 inherits

A repo with:

- Capacity bumped to a usable 10-instance ceiling.
- Three deploy-tested code-level fixes from sessions 5 and 6 (`-build` flag, debug.properties form, filename preservation, max_instances).
- A first ESE surface (`canon/surfaces/sab-building-apps`) covering the 17 pages relevant to the active blocker.
- A new canon article (`canon/articles/book-collections.md`) capturing the mental model and the open question.
- An H-008 handoff with all the materials a maintainer needs to ask Chris Hubbard / SIL the right question.

If H-008 resolves with a fix path: implement, validate via re-smoke, encode as session 7. Open-011 closes; H-002 closes; v0.1 ships.

If H-008 resolves with "this is an upstream bug": encode the response, consider pinning back to a known-good upstream tag, and continue Phase B ESE in parallel (Open-012) so canon keeps maturing while the build path is unblocked.

If H-008 takes time: continue Phase B ESE (Open-012), address Open-009 (spec drift), and surface intermediate progress.

---

## Continuation — 23:5xZ pivot to multi-pass canon workflow

The operator surfaced ptxprint-mcp's actual canon-seeding methodology: *iterative ESE → progressive disclosure rewrite → human-vs-agentic split → small-mapped-files BM25 optimization*. The four-pass structure is concretely realized in ptxprint-mcp at `canon/surfaces/` (Pass 1) → `canon/derivatives/ptxprint-training-manual.md` (Pass 2, project-audience pedagogical narrative with `[Lx · slides A–B]` back-refs) → `canon/articles/*` (Passes 3+4, 21 small agent-facing files each with `> Related articles. ...` line + frontmatter cross-refs).

Phase A's 17 pages was Pass 1 partial. This continuation extends Pass 1 with strategic Phase B coverage and starts Pass 3 with two more small articles. Pass 2 (the linear derivative training manual for SAB) is still pending and tracked as Open-013.

### D-017 — Pass 3 decomposition started; small-article pattern confirmed

Two new articles promoted from the extended surface:

- `canon/articles/apk-installation.md` — derived from PDF §3 pages 22–27. Three documented APK delivery paths, side-load warning posture, what the MCP cannot help with.
- `canon/articles/keystore-reuse.md` — derived from PDF §4.9 page 32 + PDF §2 step 19 page 21. Answers "do I need a new keystore per app?" with the full per-organization-asset framing.

Both follow ptxprint-mcp's Pass 3 conventions: `> Related articles. klappy://...` line in the blockquote, `companion_to` and `applied_canon` frontmatter, `provenance` field citing the PDF page as authority (not the surface artifact, per ESE §Promotion Rule), `audience: agent`, ≤200 lines.

This brings the appbuilder-mcp `canon/articles/` count to 7: `bundled-debug-keystore.md`, `cli-reference.md`, `failure-mode-taxonomy.md`, `payload-construction.md`, `book-collections.md`, `apk-installation.md`, `keystore-reuse.md`. (For comparison: ptxprint-mcp ships 21.)

### O-017 — Phase B continuation: 14 more pages surfaced

Surface JSON and MD updated with segments for pages 23–32 and 135–138. Coverage now 28 of 197 pages (14%). Section coverage:

- §3 Installing the app on your phone (pages 22–27) — fully surfaced.
- §4.1 What sort of apps can I build? (27–29) — all sub-sections surfaced.
- §4.2–§4.10 FAQ entries (29–32) — surfaced; §4.10 Pictures continues onto page 33 (deferred).
- §15.4.2–§15.4.5 Book Collection context-menu actions (135) — surfaced.
- §15.5.1–§15.5.6 Configuring a Book Collection tabs (136–138) — surfaced.

### O-018 — `BookNames.xml` finding (PDF §4.8 page 31)

PDF §4.8 documents that SAB's default-book-name resolution checks **`BookNames.xml`** in the same folder as the USFM files *first*, falling back to in-file `\toc2`/`\toc3` markers only when `BookNames.xml` is absent. DBL bundles use `metadata.xml` instead.

Our `eng-web_usfm.zip` (sha256 `3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278`) contains 83 USFM files plus `copr.htm`, `keys.asc`, `signature.txt.asc`, `gentiumplus.css` — and **no `BookNames.xml`**. Each USFM file does have `\h`, `\toc1/2/3` markers (verified on `02-GENeng-web.usfm`), so the documented `\toc2/\toc3` fallback should apply.

If SAB v14.0 build 129 has changed the default-book-name resolution to *require* `BookNames.xml` rather than falling back, that would explain the empty-collection-1 complaint without contradicting the PDF — it would be a fallback-that-no-longer-falls-back regression in build 129.

This is a **documented-behavior-derived hypothesis**, not a guess. It is cheap to test.

### L-012 — Documented-behavior leads have higher status than guessed leads

Session 5's filename-preservation hypothesis (e2b5067) was an honest guess based on the priming-script delta — it disproved cleanly per session 6's smoke. The BookNames.xml lead is structurally different: it's a documented expectation in §4.8 that we hadn't checked. The class hierarchy:

1. **Documented-behavior leads** (e.g. BookNames.xml). Cite the page; testable; encode as H, not Open.
2. **Documented-absence leads** (e.g. no `-bc` flag in the table). Encode as O; the absence is itself information.
3. **Behavioral-delta guesses** (e.g. filename preservation). Encode as H but mark explicitly as a guess; disprove or confirm cheaply.
4. **Speculation** (e.g. "maybe SAB requires X"). Don't encode; ask.

The discipline: a hypothesis derived from documented behavior has higher epistemic status than one derived from differential observation alone. Test (1)-class leads first.

### C-008 — Continuation-divider convention in session encodings

Session encodings can grow within a session via `## Continuation — <timestamp>Z pivot to <topic>` dividers. New IDs (D, O, L, etc.) increment as normal under the continuation. This avoids spawning artificial session N.5 documents while preserving the linear narrative structure ptxprint-mcp's session encodings demonstrate.

### H-008 — REFINED (was: ask Chris re collection 1)

Refinement: include the BookNames.xml hypothesis explicitly in the question to Chris, so the answer either confirms it ("yes, BookNames.xml is now required") or rules it out ("no, the missing piece is X"). The materials list in the original H-008 stands; add a sentence: "We notice §4.8 documents BookNames.xml as the primary book-name source with `\toc2/\toc3` as fallback. Our zip lacks BookNames.xml. Has the fallback path been tightened or removed in build 129?"

### H-009 — NEW: Test the BookNames.xml hypothesis (precedes H-008)

**One-line scope.** Generate a `BookNames.xml` for the eng-web bundle (built from the `\h`/`\toc1/2/3` markers in each USFM file), re-zip with `BookNames.xml` at the root next to the USFM files, host the new zip with a fresh sha256, and resubmit a smoke. If collection 1 populates, hypothesis confirmed and H-008 narrows to "is this regression intentional?" If collection 1 still reports empty, hypothesis falsified and H-008 stands as the next move.

**Materials needed.**

- A `BookNames.xml` schema reference (Paratext's standard format — likely available at paratextapps.org or in Paratext's own docs).
- Re-zipped bundle hosted somewhere the Container can fetch (could be a new file in this repo or any HTTPS-accessible location).
- One smoke run with a perturbed `name` to bust cache.

**Closure rule.** When the smoke completes, encode O-019 with the result. If state=succeeded and APK validates, close H-002, H-008, H-009, Open-011 in one stroke. If state=failed and the complaint persists, close H-009 (hypothesis falsified) and surface to operator with H-008 unchanged.

**Cost.** ~30 minutes of work (script the `BookNames.xml` generation, zip, host, smoke). Cheap relative to round-tripping a question to upstream.

**Priority.** P1 — same as H-002, since this could close H-002 in one session.

**Rollback.** Smoking creates no durable state changes (cache miss → new job_id; failed job is recorded but doesn't pollute anything). No rollback needed.

### Open-013 — NEW: Pass 2 derivative for SAB PDF not yet produced

The four-pass workflow ptxprint-mcp followed has Pass 2 (linear pedagogical rewrite as a single derivative document) between Pass 1 (surfaces) and Pass 3 (decomposed articles). For the SAB PDF this would be `canon/derivatives/scripture-app-builder-manual.md` — a project-audience narrative organized around a learning sequence (Part 0 "Before you start" → Part 1 "First app" → Part 2 "Configurations" → ...) with `[§N.M page P]` back-refs to the surface and the underlying PDF.

This continuation skipped Pass 2 in favor of more Phase B + Pass 3. Pass 2 is still pending and tracked as Open-013.

**Priority.** P3 — useful for human-readable navigation and onboarding, lower priority than H-009 (book-collection-1 unblock) and Phase B coverage extension. Defer to a session that can give it focused attention.

### Updated ID continuity through session 6 continuation

- **D**: D-001..D-017
- **O**: O-001..O-018
- **L**: L-001..L-012
- **C**: C-001..C-008
- **H**: H-001 (closed s4), H-002 (active), H-003 (active), H-004 (closed s1), H-005 (superseded s4), H-006 (closed s5), H-007 (closed s6), H-008 (active, refined s6 cont.), H-009 (new s6 cont., active)
- **Open**: Open-005 (closed s3), Open-006 (active), Open-007 (active), Open-008 (active), Open-009 (active), Open-010 (closed s6), Open-011 (active), Open-012 (active), Open-013 (new s6 cont., active)

Session 7 continues at D-018, O-019, L-013, C-009, H-010, Open-014 if new items emerge.
