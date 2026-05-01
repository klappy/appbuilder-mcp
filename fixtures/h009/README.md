# H-009 Test Fixture — eng-web_usfm with synthesized BookNames.xml

> Purpose: empirical test of the H-009 hypothesis (`canon/encodings/transcript-encoded-session-6.md` §H-009 / `canon/articles/book-collections.md`). Not used by the worker; not referenced from any deploy code. This directory exists solely so a smoke run can fetch a perturbed bible bundle over HTTPS via `raw.githubusercontent.com`.

---

## Contents

- **`eng-web_usfm_with_booknames.zip`** (sha256 `386e0051dab7239fc5a59400948019a64f0038b3af3d40bb1ace3a73049b829c`, 1,802,589 bytes) — the same 83 USFM files + 4 auxiliary files as the SIL priming bundle, plus a generated **`BookNames.xml`** at the zip root.
- **`build_booknames.py`** — the deterministic generator. Given a directory of USFM files, parses `\id`, `\h`, `\toc1`, `\toc2`, `\toc3` from each, and emits a Paratext-format `BookNames.xml`.

---

## Hypothesis under test

Per `klappy://canon/articles/book-collections` and `canon/encodings/transcript-encoded-session-6.md` §H-009: SAB v14.0 build 129 may have changed default-book-name resolution to require `BookNames.xml`, meaning the documented `\toc2`/`\toc3` fallback (PDF §4.8 page 31) is no longer applied. Our `eng-web_usfm.zip` (the SIL priming bundle, sha256 `3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278`) ships with well-formed `\h`/`\toc1/2/3` markers but **no `BookNames.xml`**.

If H-009 is correct, adding `BookNames.xml` to the zip will populate book collection 1 and the build will succeed.

---

## BookNames.xml schema

The format is Paratext's standard. Schema confirmed from two real-world canonical examples:

1. `sillsdev/machine` — `samples/data/VBL-PT/BookNames.xml` ([commit 89406ca](https://github.com/sillsdev/machine/blob/89406ca307b8a516caa1766d9d9ec2992a3d2888/samples/data/VBL-PT/BookNames.xml)).
2. `ethnosdev/bsb` — `database_builder/bsb_usfm/BookNames.xml` ([commit 0fb30b8](https://github.com/ethnosdev/bsb/blob/0fb30b8a498b326cf807e6f21d43e8960c0c6447/database_builder/bsb_usfm/BookNames.xml)).

Shape:

```xml
<?xml version="1.0" encoding="utf-8"?>
<BookNames>
  <book code="GEN" abbr="Gen" short="Genesis" long="The First Book of Moses, Commonly Called Genesis" />
  <book code="EXO" abbr="Exo" short="Exodus" long="The Second Book of Moses, Commonly Called Exodus" />
  ...
</BookNames>
```

UTF-8 with BOM, no DOCTYPE, no namespace, self-closing `<book>` elements.

Mapping (per SIL "Building Apps" PDF §4.8 page 31):

| Attribute | USFM source |
|-----------|-------------|
| `long`    | `\toc1` (long book name) |
| `short`   | `\toc2` (short book name) |
| `abbr`    | `\toc3` (abbreviation) |

When a `\tocN` field is empty, the generator falls back to `\h` for `short`/`long` (matching SAB's own documented fallback to `\h`/`\mt`).

---

## Reproduce

```bash
# Download source bundle
curl -L -o eng-web_usfm.zip \
  https://raw.githubusercontent.com/sillsdev/docker-appbuilder-agent/master/ansible/roles/app-builders/files/eng-web_usfm.zip
# verify: sha256sum → 3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278

# Extract, generate BookNames.xml, repackage
mkdir eng-web && cd eng-web && unzip -q ../eng-web_usfm.zip && cd ..
python3 build_booknames.py
# Output: eng-web_usfm_with_booknames.zip
# verify: sha256sum → 386e0051dab7239fc5a59400948019a64f0038b3af3d40bb1ace3a73049b829c
```

The generator is deterministic given the input zip; the same source bundle produces the same fixture sha256.

---

## Status

This is a **diagnostic fixture**, not a contractually-supported asset. Once H-009 closes (in either direction), this directory may be deleted or repurposed. The fixture is permitted to live here under the spirit of `klappy://canon/principles/scope-over-folders`: its location is an implementation detail; its meaning is the hypothesis test it enables.

If H-009 is **confirmed**, the durable container-side fix (auto-generate `BookNames.xml` inside the container when the input bundle lacks one) is a separate work item and is **not** delivered by this fixture.

If H-009 is **falsified**, this fixture remains as evidence that the hypothesis was tested empirically rather than abandoned by inference.
