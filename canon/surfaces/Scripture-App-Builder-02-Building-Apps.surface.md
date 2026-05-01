---
uri: klappy://canon/surfaces/sab-building-apps
title: "Surface — Scripture App Builder: Building Apps (Phase A)"
audience: project
exposure: nav
voice: neutral
stability: working
tags: ["surface", "ese", "appbuilder", "sab", "pdf", "non-canonical", "phase-a"]
artifact_url: https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-02-Building-Apps.pdf
artifact_sha256: 49dc27a3559ca95547241bd473525ebc8102a8a87195e0620f05efb8f6b37382
artifact_pages: 197
phase: A
phase_a_pages: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 36, 37, 38, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138]
canonical_status: interpretive_non_canonical
ese_method: klappy://canon/methods/epistemic-surface-extraction
companion: Scripture-App-Builder-02-Building-Apps.surface.json
date: 2026-04-30
---

# Surface — Scripture App Builder: Building Apps (Phase A)

> Awareness layer over SIL's official SAB user manual (Richard Margetts, 2026-03-26 edition, 197 pages). Phase A surfaces 28 critical pages: file-prep formats, the GUI New App wizard walkthrough, the CLI option table, and the Book Collections tab. Companion to `Scripture-App-Builder-02-Building-Apps.surface.json` (machine-usable).

---

> **Containment.** This artifact is interpretive and non-canonical. It may illustrate themes from the SAB Building Apps PDF but does not define rules. If it can be safely treated as instruction, it has failed. The PDF itself is the authority. **Canon overrides this surface; this surface overrides nothing.**

---

## Artifact registration

| Field | Value |
|---|---|
| Title | Scripture App Builder: Building Apps |
| Format | PDF, 197 pages, 7,446,598 bytes |
| URL | https://software.sil.org/downloads/r/scriptureappbuilder/Scripture-App-Builder-02-Building-Apps.pdf |
| sha256 | `49dc27a3559ca95547241bd473525ebc8102a8a87195e0620f05efb8f6b37382` |
| Author | Richard Margetts (SIL International) |
| Generator | Microsoft® Word 2013 |
| Created | 2026-03-26 |
| License | Not stated in PDF metadata; treat as upstream documentation; do not re-host |

## Segmentation

- **Modality:** PDF
- **Unit:** page (1 segment per page, per ESE §Segmentation Rules)
- **Anchor type:** page number (1-indexed)
- **Anchor stability note:** Anchors are 1-indexed page numbers. Stable so long as SIL does not re-paginate. Section headings (e.g. `§15.1.1`) are a secondary anchor; if pagination shifts we can re-anchor by heading.
- **Phase:** A — 28 of 197 pages (extended in this session with Phase B continuation: §3 install + §4.1–§4.10 FAQ + §15.4.2–§15.5.6 deep dive). Phase B remaining: 169 pages.

## Global surface

**One sentence:** User manual for Scripture App Builder v14.0 — describes how to build Android scripture apps via a GUI wizard, a command-line interface, and per-feature configuration tabs; targets translators preparing apps for distribution.

**Key themes:**
- Bible-text ingestion formats (USFM/USX/DBL/docx/zip)
- GUI New App wizard as the primary build path
- Command-line interface as a documented secondary path with a defined option table
- Project structure organized around Book Collections, individual Books, and per-feature config tabs
- Signing via keystore (created in-wizard or supplied externally)

**Forbidden moves:**
- Do not treat this surface as instruction. The PDF itself is the authority.
- Do not promote bullets here into canon. If a durable insight is found, edit canon directly (e.g. `canon/articles/cli-reference.md` or a new article) and reference the PDF page as authority.
- Do not assume the CLI option table on page 37 is exhaustive; the bullets observe what the table prints. Undocumented flags may exist.

---

## Per-page surfaces

### Page 14 — §1 Preparing content for your app + §1.1.1 Paratext files

- Names three text formats for Scripture: Paratext (.usfm/.sfm/.ptx), USX (.usx), and Digital Bible Library Text Release Bundles (.zip).
- Separates Scripture-book formats from non-Scripture content formats (.docx, .sfm, .html, .bloompub).
- States that USFM files are 'the files used in Paratext projects — one per book of the Bible.'
- *Inference: this is the upstream authority for `payload.bible_source.kind ∈ {usfm_zip, usx_zip, burrito_zip}` in our schema; DBL is the burrito ancestor.*

> **Quote (page 14):** "The Scripture text needs to be in one of the following formats: Paratext files, USX files, Digital Bible Library Text Release Bundles."

*Visuals:* Embedded sample USFM excerpt with markers \c, \s, \p, \v, \q1, \q2, \r — illustrates a chapter-and-verse-marked Scripture file in a non-English language.

**Cross-refs:** `illustrates → klappy://canon/articles/payload-construction`

---

### Page 15 — §1.1.1 cont. + §1.1.2 Other SFM text files

- Names the standard USFM markers SAB consumes: \c (chapter), \s (section heading), \p (paragraph), and references paratext.org/about/usfm.
- Recommends running Paratext Basic Checks before app build — calls out Chapter/Verse Numbers, Markers, and References as 'critical.'
- States that non-Scripture SFM files must begin with `\id XYZ` where XYZ is a unique alphanumeric code distinct from any Scripture book ID.
- Requires UTF-8 encoding for Unicode text content.

> **Quote (page 15):** "The first marker in the file must be in the form \id XYZ, where XYZ is a unique, alphanumeric code you choose."

**Cross-refs:** `illustrates → klappy://canon/articles/payload-construction`

---

### Page 16 — §1.1.3 Word .docx + §1.1.4 DBL bundles + §1.1.5 HTML + §1.1.6 Bloom

- Word documents (.docx): preserves bold/italic/underline, lists, hyperlinks, footnotes, simple tables; chapter breaks via Ctrl+Enter.
- DBL Text Release Bundles are 'zip files containing USX files for each book as well as other configuration information' — describes the burrito ancestor's shape.
- HTML is supported but audio-text synchronization is not yet supported with HTML.
- Bloom books require .bloompub format and render via embedded Bloom Player.

> **Quote (page 16):** "DBL bundles are zip files containing USX files for each book as well as other configuration information."

**Cross-refs:** `compresses → klappy://canon/articles/payload-construction`

---

### Page 17 — §1.2 Images + §1.3 Audio + §2 intro How to build your first app

- Image formats: JPEG or PNG; specific items have constraints (e.g. navigation drawer image must be PNG with 16:9 aspect ratio).
- Audio formats: MP3, 3GP, or WebM (Ogg Opus); 'normally one audio file per page or chapter'; CBR required for audio-text sync.
- §2 introduces the New App wizard as the primary build path.
- *Inference: §2's GUI walkthrough is the canonical reference for what a successful build invocation accomplishes; the CLI in §4.14 is documented as an alternative path to the same outcome.*

> **Quote (page 17):** "To build your first app with Scripture App Builder, you should use the New App wizard."

---

### Page 18 — §2 New App wizard, steps 1–6 (App Name → Package → Book Type → Books)

- Wizard step 1: App Name (e.g. 'Dogon Bible'); becomes launcher label; recommended ≤20 characters.
- Wizard step 2: Package Name — 'a dot-separated string which uniquely identifies your app.'
- Wizard step 5: Book Type page — choose text or audio-only.
- Wizard step 6 (Books page): 'Click Add Books… and select the books you want to see in the app.' Supported: USFM/USX/DBL bundle/docx/zipped USFM or USX.
- *Inference: this is the GUI equivalent of CLI flag `-b`; the books selected here are added to the app's default Main Collection (a.k.a. 'book collection 1' in build-error messages).*

> **Quote (page 18):** "Click Add Books… and select the books you want to see in the app."

> **Quote (page 18):** "These can be USFM (Paratext) files, USX files, Digital Bible Library text release bundles."

**Cross-refs:** `illustrates → klappy://canon/articles/payload-construction`

---

### Page 19 — §2 New App wizard, steps 7–13 (Book Order → Book Names → Language → Copyright → Font → Choice of Fonts → Font Handling)

- Wizard step 7: Book Order — 'Choose the book ordering according to the church tradition of the target users.'
- Wizard step 8: Book Names — option to convert all-caps to mixed case.
- Wizard step 9: Language — language code + name; supports script/region/variant.
- Wizard step 10: Copyright and Licensing — uses Copyright Helper wizard.
- Wizard steps 11–13: Font, Choice of Fonts, Font Handling — supports SIL fonts list or external TrueType file; GeckoView option for complex scripts.

---

### Page 20 — §2 New App wizard, steps 14–18 (Color Scheme → Default Interface Language → Interface Languages → Features → Icon)

- Wizard step 14: Color Scheme — drives main app bar color; individual element colors customizable later.
- Wizard step 15: Default Interface Language — language for app menus.
- Wizard step 17: Features — toggles Verse of the Day, Verse on Image, etc.
- Wizard step 18: Icon — choose from preset images table or supply own PNG via Browse.

---

### Page 21 — §2 New App wizard, steps 19–21 (Signing → Project)

- Wizard step 19: Signing — keystore + alias required so the APK can install on a phone.
- Wizard offers Create KeyStore button if no keystore exists; collects filename, password, alias, alias password, and Certificate Issuer details.
- States: 'Once the app is published, it cannot be updated without the keystore password.'
- Wizard step 20: re-asks keystore password and key alias on Signing page (in case keystore was created externally).
- Wizard step 21: Project — internal-only project name + optional description; not visible to end users.

> **Quote (page 21):** "Once the app is published, it cannot be updated without the keystore password."

**Cross-refs:** `illustrates → klappy://canon/articles/bundled-debug-keystore`

---

### Page 22 — §2 cont.: Build Android App + §3 Installing the app on your phone (intro)

- After wizard completion, user clicks 'Build Android App' on toolbar to compile.
- States: 'If something is not configured correctly for the build to work, you will be notified.' — the same code path our SAB-cli sees from `-build`.
- First build connects to internet to download files; subsequent builds may go offline (Tools → Settings → Build Settings).
- Successful build produces an APK file; described as 'the installation file for an Android app.'
- *Inference: SAB v14.0's 'no books for book collection 1' build error in our smoke is generated by this same notification mechanism — meaning the project on disk has zero books in collection 1 at -build time, regardless of CLI banner saying `Book filename:` was set.*

> **Quote (page 22):** "If something is not configured correctly for the build to work, you will be notified."

**Cross-refs:** `illustrates → klappy://canon/articles/failure-mode-taxonomy`

---

### Page 23 — §3 cont.: Installing the app — three transfer methods

- Lists three documented APK-to-phone transfer methods: WiFi transfer (Xender, WhatsApp), USB copy via cable, automatic install via SAB's Install APK toolbar button.
- States Android side-loading (installing outside Play Store) may trigger 'suspicious file' warnings or virus-scan prompts on the user's phone — described as 'normal' but worth preparing users for.
- Auto-install path requires USB data cable (charge-only cables won't work) and Developer Options enabled on the phone.
- *Inference: for an MCP that hands an APK URL to an end user, the agent's user-facing instructions should mirror these three options, not assume Play Store distribution.*

> **Quote (page 23):** "Use the following steps: 1. Connect your Android phone to your computer using a USB data cable."

---

### Page 24 — §3 cont.: Enabling Developer Options (1/2)

- Documents the seven-tap-on-Build-Number ritual to enable Developer Options on Android: Settings → About Phone → tap Build Number seven times.
- Notes UI variation across phones: 'Different phones place Developer Options in different places, so look around your Configuration menu until you find it.'
- Recommends Settings search bar to find 'USB Debugging' directly when navigation fails.

> **Quote (page 24):** "Tap on the Build Number seven times."

*Visuals:* Three sequential phone screenshots showing Build Number tap progression and resulting toast messages ('You are now N steps away from being a developer').

---

### Page 25 — §3 cont.: Enabling USB Debugging (2/2)

- Inside Developer Options, the relevant toggle is 'USB Debugging' — must be on for SAB's auto-install path to find the device.
- Phone prompts 'Allow USB Debugging?' on first connection; tap OK.
- Suggests 'Always allow from this computer' checkbox to skip the prompt on future connections.

*Visuals:* Two phone screenshots: USB Debugging toggle in Developer Options; Allow-USB-Debugging confirmation dialog.

---

### Page 26 — §3 cont.: Install APK toolbar action

- After USB Debugging is enabled, the GUI flow completes via toolbar 'Install APK' button — copies the APK to phone, installs, and launches.
- Common error 'No devices/emulators found' indicates phone-not-connected, phone-locked, or USB-debugging-disabled.
- *Inference: the CLI does not expose this path (no `-install-apk` flag in the §4.14 table); CLI users transfer the APK manually after `-build`.*

---

### Page 27 — §3 tail + §4.1 What sort of apps can I build? + §4.1.1 Scripture apps

- Documents an optional 'After Build' setting that combines build + install + launch into one toolbar action: Tools → Settings → After Build.
- §4 (FAQ) opens with §4.1: SAB can build Scripture apps, story books, lectionaries, song books, quiz books, or 'hybrid' apps combining multiple modules.
- States: 'You can even combine these different types of modules into a single app according to your wider Scripture Engagement strategy.'
- *Inference: v0.1 scope is the Scripture sub-case; v1.x can expose the other module types via additional `-b` invocations or `-ft` feature flags.*

---

### Page 28 — §4.1 cont.: Picture Storybook + Lectionaries + Bloom collections

- Picture Storybook apps: SFM or Word format input; supports ContextMenu, audio, copyright per resource, links between books.
- Lectionary pattern: 'one book per collection per year' — each season's lectionary is a separate book, in SFM, that may contain Scripture-reference links to a parallel Scripture book collection in the same app.
- *Inference: lectionary use case implies multi-collection apps where one collection contains lectionary text and another contains the Scripture text it links into — a v1.x scope item, not v0.1.*

---

### Page 29 — §4.1 cont.: Song Book + Quiz + Hybrid apps + §4.2 contextualizing

- Song Book apps: SFM or Word format; multiple song books can share a single contents menu.
- Quiz apps: separate document 'Creating Applications with Quizzes' under SAB Help menu; not in the Building Apps PDF.
- Hybrid apps: combine modules under one book collection if same language; if separate collections, two-pane and verse-by-verse views must be disabled (per Books → Layouts).
- States: 'It is normally advised to put these different resources all under the same book collection if they are all in the same language.'
- *Inference: hybrid + multi-collection routes hit the same book-collection-population complexity that blocks v0.1's even single-collection case.*

---

### Page 30 — §4.2 contextualize tail + §4.3 Find setting + §4.4 Package name + §4.5 Audio intro

- §4.3: SAB has a built-in search for finding settings/features ('Find…' on the toolbar).
- §4.4 (package name): 'The app package name needs to be unique and cannot change once the app is published.' Detail in App Project Menu §Package.
- §4.5 (audio): SAB supports per-chapter or per-page audio plus short audio clips for quizzes or word-tap interactions.
- Quote: '[Audio] usually one audio file per chapter / page.'
- *Inference: the package-name immutability rule shapes our `payload.package` validation regex — already enforced in `payload.ts` per session-1 D-007.*

---

### Page 31 — §4.5 audio cont. + §4.6 multiple translations + §4.7 verse text + §4.8 default book names — Paratext BookNames.xml

- Multiple-translation apps require multiple Book Collections: 'To add another translation, you will need to create a new book collection.'
- **§4.8 (significant for Open-011):** SAB's default book-name resolution checks Paratext's `BookNames.xml` *first*, then falls back to USFM `\toc2`/`\toc3` markers in the book files themselves.
- Quote: 'If your books are in a Paratext project, the first place SAB will look for the book names is in the BookNames.xml file in the same folder as the USFM files.'
- USFM standard mapping: `\toc1` = long name, `\toc2` = short name, `\toc3` = abbreviation.
- *Inference: Our `eng-web_usfm.zip` contains 83 `*.usfm` files plus auxiliary files (`copr.htm`, `keys.asc`, `signature.txt.asc`, `gentiumplus.css`) — but **no `BookNames.xml`**. Each USFM file does have `\h` and `\toc1/2/3` markers, so the documented fallback should apply. If SAB v14.0 build 129 has tightened the default-book-name resolution to require `BookNames.xml`, that would explain the empty-collection-1 complaint. This is a documented-behavior-derived hypothesis, not a guess.*

> **Quote (page 31):** "If your books are in a Paratext project, the first place SAB will look for the book names is in the BookNames.xml file in the same folder as the USFM files."

**Cross-refs:** `extends → klappy://canon/articles/book-collections`

---

### Page 32 — §4.8 cont. (DBL metadata.xml) + §4.9 Keystore reuse + §4.10 Pictures intro

- DBL bundles use `metadata.xml` (instead of `BookNames.xml`) as the source for book names.
- §4.9 (relevant for `bundled-debug-keystore.md`): 'You can use the same keystore and key alias for all or several of your apps.'
- Cites Android signing docs at developer.android.com/tools/publishing/app-signing.html as authoritative.
- §4.10 begins (continues across pages 32–33): supported image formats are JPG and PNG; image association methods include USFM/USX placement, picture lists, and toolbar wizards.
- *Inference: §4.9 is a small but durable insight worth promoting as `canon/articles/keystore-reuse.md` — answers a likely agent question without forcing a doc lookup.*

> **Quote (page 32):** "You can use the same keystore and key alias for all or several of your apps."

**Cross-refs:** `illustrates → klappy://canon/articles/bundled-debug-keystore`

---

### Page 36 — §4.13 cont. (glossaries) + §4.14 Can I build an app from the command line?

- Confirms SAB has a CLI: 'Scripture App Builder has a command line interface which allows you to create a new app and build it, or load an existing app and build it.'
- CLI binary name is `sab`; lives at `c:\Program Files (x86)\SIL\Scripture App Builder` on Windows.
- States the two top-level operating modes: `-new` (create) and `-load <project>` (open existing).
- *Inference: there is no documented path described in §4.14 for adding books to a *separate* collection in CLI mode — the section frames `-b` as the way to add books, full stop.*

> **Quote (page 36):** "Yes, Scripture App Builder has a command line interface which allows you to create a new app and build it."

**Cross-refs:** `compresses → klappy://canon/articles/cli-reference`

---

### Page 37 — §4.14 cont.: CLI option table (top half)

- Lists the canonical CLI option set: `-new`, `-load <project>`, `-build`, `-no-save`, `-?`, `-n <app-name>`, `-p <package-name>`, `-b <filename>`, `-i <filename>`, `-a <filename>`, `-f <fontname>`, `-ic <filename>`, `-l <lang-code>`, `-ft <feature=value>`, `-vc <integer>`, `-vn <string>`, `-ks <filename>`, `-ksp <password>` (table continues on page 38).
- Defines `-b <filename>`: 'Add book or bundle file. This could be a USFM file or a zipped set of USFM files. It could also be a Digital Bible Library text release bundle.'
- Defines `-i <filename>`: 'Include additional parameters file' — flat list of CLI flags, not key=value (corrects an earlier session-5 misreading).
- Defines `-build`: 'Build app project (use with either -new or -load).'
- *Inference: no flag named `-bc`, `-collection`, `-add-books`, or similar appears in the table — there is no documented secondary 'add books to collection N' CLI option.*

> **Quote (page 37):** "Add book or bundle file. This could be a USFM file or a zipped set of USFM files."

**Cross-refs:** `compresses → klappy://canon/articles/cli-reference`

---

### Page 38 — §4.14 cont.: CLI option table (bottom half) + worked examples

- Lists remaining CLI options: `-ka <alias>`, `-kap <password>`, `-fp <folder=path>` (e.g. `app.builder=c:\Scripture App Builder`).
- Provides exactly two worked example invocations: one `-new` build and one `-load` rebuild.
- The `-new` example: `sab -new -n "My App" -p com.example.myapp -b MyBookBundle.zip -f "Charis SIL Compact" -i keys.txt –build`. Single `-b`; build-time and runtime keystore credentials live in `keys.txt` (the `-i` file).
- The `-load` example: `sab -load "My App" -build` — rebuild only; no `-b` needed because books were already added during the prior `-new`.
- *Inference: per the worked example, one `-b <zip>` is supposed to populate the new app's default collection such that `-build` succeeds. Our smoke does exactly this, with a well-formed USFM zip, and SAB v14.0 build 129 still reports the collection empty at build time. This is the gap that motivates a question to the upstream maintainer (Chris Hubbard or SIL).*

> **Quote (page 38):** "sab -new -n "My App" -p com.example.myapp -b MyBookBundle.zip -f "Charis SIL Compact" -i keys.txt -build"

**Cross-refs:** `compresses → klappy://canon/articles/cli-reference`

---

### Page 129 — §14.5 Radio (tail) + §15 The Books project menu (intro) + §15.1 The Book Collections tab (intro)

- Defines: 'A Book Collection is a set of books that can be logically grouped together.'
- Defines default state: 'Most simple apps have a single book collection (called Main Collection by default).'
- Frames the Books project menu as 'where all your book collections and individual books are added and modified.'
- *Inference: the build-time error 'no books for book collection 1' refers to the default Main Collection, which exists in every new app but is empty until books are added.*

> **Quote (page 129):** "A Book Collection is a set of books that can be logically grouped together."

> **Quote (page 129):** "Most simple apps have a single book collection (called Main Collection by default)."

---

### Page 130 — §15.1.1 Adding a Book Collection

- Describes the GUI flow for adding a Book Collection: 8-step wizard (Name → Books → Book Order → Book Names → Language → Copyright → Restrictions → Finish).
- GUI step 3 of the Add-Book-Collection wizard: 'Click Add Books to add the book files to the book collection.' This is the action that populates a collection with books.
- *Inference: in the GUI, adding a Book Collection and adding Books to it are two distinct sub-actions inside the same wizard. The CLI's `-b` flag must collapse both into one — but only when `-new` creates the default Main Collection.*
- Quote: short name appears 'at the top right of the viewer page in the app' and is tap-able to open the layout configuration dialog.
- *Inference: the PDF does not document a CLI flag corresponding to the GUI's 'Add Books' wizard step inside an existing collection — the GUI is the only documented path to add books to a non-default collection.*

> **Quote (page 130):** "Click Add Books to add the book files to the book collection."

**Cross-refs:** `extends → klappy://canon/articles/payload-construction`

---

### Page 131 — §15.1.1 cont. (Steps 6–8 of Add-Book-Collection wizard) + §15.1.2 Importing a Book Collection

- Step 6: Language page — language code + name; supports script/region/variant per book collection.
- Step 7: Copyright and Licensing — applies per book collection.
- Step 8: Restrictions — usage restrictions per book collection.
- §15.1.2: book collections can be exported and imported as `.appBooks` files; 'easy way to transfer a collection and all its settings.'
- *Inference: `.appBooks` is a per-collection serialized format; could be relevant if SAB v14.0 expects a Book Collection to be imported from a `.appBooks` file rather than constructed from a raw USFM zip.*

> **Quote (page 131):** "To Import a book collection, click the Import… button. Select an .appBooks file and click Open."

---

### Page 132 — §15.2 The Layouts tab

- Multi-translation layouts: Single Pane, Two Pane (portrait stacks; landscape side-by-side), Verse-by-Verse (interleaved).
- Verse-by-Verse renders translations in different color fonts.
- Layout choice is a per-app setting controlled in the Layouts tab; out-of-scope for v0.1 single-translation builds.

*Visuals:* Two side-by-side screenshots labeled 'Single Pane Layout' and 'Two Pane Layout (portrait).'

---

### Page 133 — §15.2 cont. + §15.3 The Layout Configuration tab (intro)

- Two Pane Layout (landscape) and Verse-by-Verse and Layout Configuration screenshots illustrated.
- User-facing 'Select Language and Layout' screen lets end users choose which layout to view.
- Multi-collection apps can offer a layout chooser at first launch.

*Visuals:* Three screenshots: Two Pane (landscape), Verse-by-Verse, Layout Configuration.

---

### Page 134 — §15.3 Layout Configuration tab (cont.) + §15.4 Book Collection Context Menu (View)

- 'Link panes' option in Two Pane view requires both collections to share book IDs (typically Paratext IDs).
- Layout Configuration access is exposed in three places: navigation drawer menu item, toolbar icon, or tap on book collection abbreviation.
- Right-click context menu on a Book Collection in the project tree exposes the per-collection actions (View, etc., continued on subsequent pages).
- *Inference: the per-collection 'View' command opens the configuration window — which is the GUI's affordance to inspect what books a collection actually contains. No CLI equivalent is documented.*

---

### Page 135 — §15.4.2 Delete + §15.4.3 Export (.appBooks) + §15.4.4 Fine Tuning + §15.4.5 Slideshow + §15.5 Configuring intro

- §15.4.3 confirms `.appBooks` is the per-collection export format: 'save the book collection as an .appBooks file that can be imported into another project using the Import function.'
- §15.4.2 Delete is unavailable when only one collection exists.
- §15.4.4–5 cover audio-timing and slideshow-video features (out of v0.1 scope).
- *Inference: `.appBooks` is the only documented serialized representation of a fully-configured Book Collection. If `-b <usfm-zip>` is no longer the path SAB v14.0 uses to populate collection 1, an alternative path could be: pre-build a `.appBooks` file and load it at -new time. No CLI flag for this is documented in §4.14, so it would require operator-side intervention.*

---

### Page 136 — §15.5.1 cont.: Book Collection ID + Name + Add Books + Add Using Wizard

- Each Book Collection has a Book Collection ID (e.g. `DYU`, `LSG`) — short, language- or translation-coded.
- **Add Books… button** on the collection's Book Collection tab: 'Use the Add Books… button to add one or more books to a collection.' This is the GUI affordance the CLI's `-b` is meant to replicate.
- Quote: 'Adding books this way does not ask for any specific book details. You can add those later by double-clicking on a book in the collection book table.'
- **Add Using Wizard…** is a separate button that asks text-vs-audio-only first.
- *Inference: the GUI explicitly distinguishes 'add books' from 'specify per-book details.' The CLI's `-b` collapses both. If SAB v14.0 build 129 requires per-book details (e.g. via BookNames.xml) before counting books toward a collection, that's the gap behind 'collection 1 empty.'*

> **Quote (page 136):** "Use the Add Books… button to add one or more books to a collection."

**Cross-refs:** `extends → klappy://canon/articles/book-collections`

---

### Page 137 — §15.5.1 short name + §15.5.2 Image + §15.5.3 Language + §15.5.4 Copyright

- Short name (≤10 chars) appears at app's top right and links to the Select-language-and-layout screen.
- §15.5.3 Language tab: optional language code + name per collection; 'necessary if you will be building a Modern PWA.'
- §15.5.4 Copyright tab: per-collection localizable copyright; reiterates legal-distribution responsibility.
- *Inference: PWA build (`-build-modern-pwa` in our payload) requires a per-collection language code. v0.1 doesn't surface a per-collection language slot — the schema sets one app-wide language only. v1.x scope item if PWA becomes a primary deliverable.*

---

### Page 138 — §15.5.5 Layouts (per-collection) + §15.5.6 Sharing

- §15.5.5 Layouts: per-collection override of the app-level Layouts tab; supports licensing-driven Restrictions (e.g. some collections cannot appear in single-pane layout alone).
- §15.5.6 Sharing: per-collection toggles for whether/how users can share text, audio, or video clips from a collection.
- Adding sharing-of-audio-clips is gated on an extra code library SAB pulls in.
- *Inference: licensing constraints are first-class per-collection settings; v0.1 does not surface them, but v1.x payload schema may need a `restrictions` block per `bible_source` if multi-collection support lands.*

---

## Provenance

- **Extraction method:** Manual reading of pypdf-extracted page text by Claude in session 6 (2026-04-30). Bullets crafted to be observational with short quotes (≤25 words) per ESE §Surface Bullet Rules.
- **Tooling:** pypdf 5.9.0
- **Session:** `klappy://canon/encodings/transcript-encoded-session-6`
- **ESE method:** `klappy://canon/methods/epistemic-surface-extraction`
- **Human review status:** unreviewed

## See also

- `Scripture-App-Builder-02-Building-Apps.surface.json` — machine-usable companion (source of truth)
- `klappy://canon/articles/cli-reference` — promoted CLI reference (maintained separately; this surface compresses pages 36–38)
- `klappy://canon/articles/payload-construction` — agent-facing payload guide (this surface illustrates pages 14–18)
- `klappy://canon/articles/bundled-debug-keystore` — keystore article (this surface illustrates page 21)
- `klappy://canon/methods/epistemic-surface-extraction` — the ESE method this artifact follows
