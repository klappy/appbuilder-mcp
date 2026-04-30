---
uri: klappy://canon/surfaces/readme
title: "canon/surfaces — Epistemic Surface Extraction artifacts"
audience: project
exposure: nav
voice: instructional
stability: working
tags: ["canon", "surfaces", "ese", "navigation", "non-canonical"]
canonical_status: navigational
date: 2026-04-30
governs: "the directory convention for ESE sidecar artifacts in this repo"
applied_canon:
  - "klappy://canon/methods/epistemic-surface-extraction"
---

# canon/surfaces — Epistemic Surface Extraction artifacts

> Sidecar files that make non-text evidence (PDFs, screenshots, recordings) legible to agents and humans without turning them into doctrine. **Surfaces are interpretive and non-canonical.** They illustrate; they do not instruct.

## Convention

For an upstream artifact `<name>.<ext>`, this directory holds:

| File | Role |
|---|---|
| `<name>.surface.json` | Authoritative, machine-usable extraction (source of truth) |
| `<name>.surface.md` | Human-readable rendering, derived from the JSON |

Both files conform to the contract in [`klappy://canon/methods/epistemic-surface-extraction`](klappy://canon/methods/epistemic-surface-extraction):

- Artifact registration with sha256 + URL + provenance
- Segmentation per modality (PDFs: 1 segment per page)
- 3–5 observational bullets per segment (max), short quotes (≤25 words)
- Mandatory containment clause ("interpretive and non-canonical")
- Cross-refs to canon using `illustrates` / `compresses` / `reinterprets` / `extends` / `contradicts`

## Promotion rule

Surfaces inform canon edits but **do not become canon**. If a surface reveals a durable insight, promote the insight by editing canon (e.g. extending an article in `canon/articles/`), not by referencing the surface as authority.

Example flow:

1. Surface a SIL PDF and observe that the GUI Add-Book-Collection wizard has "Add Books" as a discrete sub-step.
2. That observation motivates a new canon article (`canon/articles/book-collections.md`) that names the mental model and ties it to our SAB CLI usage.
3. The article cites the PDF page as authority. The surface artifact is the navigation layer; the article is the canon.

## Current surfaces

| Surface | Pages covered | Phase | Companion article(s) |
|---|---|---|---|
| `Scripture-App-Builder-02-Building-Apps.surface.json` / `.md` | 14–22, 36–38, 129–134 (17 of 197) | A | `cli-reference.md`, `payload-construction.md`, `book-collections.md` |

Phase B for the SAB Building Apps PDF (remaining 180 pages) is pending; tracked in session encodings.
