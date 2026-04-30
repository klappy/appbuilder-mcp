---
uri: klappy://canon/articles/book-collections
title: "Book Collections — How SAB Groups Books and Where -b Lands"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "sab", "book-collections", "cli", "v14"]
companion_to: "canon/articles/cli-reference.md, canon/articles/payload-construction.md, canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md"
applied_canon:
  - "klappy://canon/principles/dry-canon-says-it-once"
  - "klappy://canon/principles/maintainability-one-person-indefinitely"
canonical_status: non_canonical
date: 2026-04-30
status: working
provenance: "Promoted from canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md (pages 18, 36-38, 129-131) per ESE §Promotion Rule. Authority: the SIL PDF; this article is a separately-authored canon edit, not a re-reference of the surface."
---

# Book Collections — How SAB Groups Books and Where `-b` Lands

> **What this answers.** What is a "book collection" in SAB? How does the GUI populate one? How does the CLI populate one? What does it mean when SAB says `Add one or more books for book collection 1` at `-build` time?
>
> **Why this exists as canon.** Session 6's first end-to-end smoke against SAB v14.0 build 129 surfaced a behavioral gap: a single `-b <usfm-zip>` does not reliably populate the default Book Collection in this build, contrary to the worked example on PDF page 38. This article captures the mental model and the open question.

---

## What a Book Collection is

> "A Book Collection is a set of books that can be logically grouped together." — SAB Building Apps PDF, §15.1, page 129.

Every SAB project has at least one Book Collection. The first one is named **Main Collection** by default; SAB's build-error messages refer to it as "**book collection 1**." Apps with a single translation typically have only this one collection. Apps with multiple translations have one collection per translation, each with its own copyright, language, layout, and book-order configuration.

A book collection is a *container*, not the books themselves. The collection exists from the moment a project is created (`-new` on the CLI, the New App wizard in the GUI). Books are added *to* the collection in a separate sub-action.

## How the GUI populates a collection

Two distinct GUI paths land books inside a collection (PDF §2 step 6 and §15.1.1, pages 18 and 130):

1. **New App wizard (default Main Collection).** On the wizard's *Books* page, the user clicks **Add Books…** and selects USFM, USX, DBL bundle, .docx, or a zipped USFM/USX file. The wizard places those books into the project's default Main Collection.
2. **Books → \<Collection Name\> → Book Collection → Add Books (existing collection).** From the project tree, the user expands a collection, opens its Book Collection tab, and clicks **Add Books** again. This adds books to that specific collection (default or user-added).

Both paths use the same "Add Books" affordance. The mechanic is: pick the collection, then add books to it.

## How the CLI populates a collection

The PDF's §4.14 documents one CLI-level affordance for adding books:

| Flag | PDF text |
|---|---|
| `-b <filename>` | "Add book or bundle file. This could be a USFM file or a zipped set of USFM files. It could also be a Digital Bible Library text release bundle." |

The PDF's worked example on page 38 demonstrates a successful `-new` build with a single `-b`:

```
sab -new -n "My App" -p com.example.myapp -b MyBookBundle.zip \
        -f "Charis SIL Compact" -i keys.txt -build
```

This implies: in CLI mode, `-b <bundle>` is meant to populate the new app's default Main Collection. The PDF documents no separate "add books to collection N" CLI flag.

## What we observe in SAB v14.0 build 129

Per `canon/encodings/transcript-encoded-session-6.md` O-014, our smoke build against `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito` running SAB v14.0 build 129 (released 2026-04-30) does this:

1. Submits `-new -n "..." -p ... -b /path/to/eng-web_usfm.zip -ks <debug.keystore> -i <debug.properties> -fp build=... -build`.
2. The zip is well-formed: 83 USFM files at root, named `<order>-<bookid>eng-web.usfm`, each with `\id <BOOK> World English Bible (WEB)`, `\h`, `\toc1/2/3`, `\c`, `\v` markers (verified locally).
3. SAB's "Create New App Project" banner reports every parameter as accepted, including `Book filename: /tmp/.../assets/eng-web_usfm.zip`.
4. SAB's `-build` step then refuses with: `Before building the app, please do the following: - Add one or more books for book collection 1.`

The bundle name is preserved (`eng-web_usfm.zip`, matching SIL's own priming-script convention). The `-build` flag is present. The keystore is supplied in the form the priming script demonstrates. Yet collection 1 reports empty.

**The PDF does not explain this.** No `-bc`, `-collection`, or `-add-books` flag exists in the documented option table. The PDF's own worked example asserts that `-b ... -build` produces a built APK.

## Open question (H-008)

> Given image `ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito`, SAB v14.0 build 129, and a well-formed USFM zip in the priming-script style: is there a flag, file-format expectation, or import step that we're missing for `-b <zip>` to register books with book collection 1 such that `-build` succeeds?

This is the H-008 handoff to Chris Hubbard / SIL. The PDF's documented surface is exhausted; the next step is upstream domain knowledge.

## What this means for `submit_build` callers

For v0.1 (this build of SAB), end-to-end APK builds with the bundled debug keystore are **not yet validated**. Until H-008 resolves:

- `submit_build` requests will execute, the container will run SAB, and the call will return a `failed` job with `failure_mode: hard` and `errors[0]` reporting the book-collection-1 message.
- The build log is preserved in R2 at `outputs/<job_id>/<package>_<sanitized-name>_appbuilder.log` and is fetchable via `log_url` in `get_job_status`.
- This is *not* a payload-shape problem on the caller's side — the same payload would build successfully on an earlier SAB version per the PDF.

Callers building agents against this MCP should treat v0.1 as "submission and observability work end-to-end; APK production blocked on upstream resolution."

## See also

- `klappy://canon/articles/cli-reference` — full SAB CLI option table
- `klappy://canon/articles/payload-construction` — how to build a `submit_build` payload
- `klappy://canon/surfaces/sab-building-apps` — non-canonical surface over the SIL PDF
- `klappy://canon/encodings/transcript-encoded-session-6` — session encoding with the smoke evidence
- `klappy://canon/articles/failure-mode-taxonomy` — how SAB's build-time complaints are classified
