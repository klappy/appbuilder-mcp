# H-010b Test Fixture — eng-web USFM as a SAB project zip

> Purpose: empirical test of H-010b. Tests the modified container's project-zip detection branch — when the input zip contains a `*.appDef` at root, the container should `-load` it instead of `-new -b`-ing it.

---

## Provenance

This fixture is the output of running `container/main.py`'s `synthesize_project_from_usfm()` against the SIL priming bundle `eng-web_usfm.zip` (sha256 `3c34cb69b4efe0670217e9fbf95b4f92501fcde319aa2e5c5a347097ff655278`), then renaming `build.appDef → Web Bible.appDef` and `build_data → Web Bible_data` to match the `<name>.appDef` + `<name>_data/` shape that real SAB projects ship in (see `sil-car/sango-transition-guide-app`).

- Fixture sha256: `153ede0ba4555822a6db99393e2ea01644dd3a42d2141cd9da085acfb43e0f85`
- Size: 1,806,466 bytes (1.8 MB)
- Layout:
  ```
  Web Bible.appDef                                 ← project XML, <books id="C01"> populated with 83 entries
  Web Bible_data/
    books/<each *.usfm from eng-web_usfm.zip>      ← 83 USFM files
    copr.htm, keys.asc, signature.txt.asc, gentiumplus.css ← preserved auxiliary files
  ```

The `<books id="C01">` element is populated by parsing each USFM file's `\id`, `\h`, `\toc1`, `\toc2`, `\toc3` markers and emitting one `<book id="..."><name>...<filename>...</filename></book>` per book. Mapping per SIL "Building Apps" PDF §4.8: `\toc1 → long`, `\toc2 → short`, `\toc3 → abbreviation`. The container does the same synthesis on-the-fly when it receives a bare USFM zip (H-010c path) — this fixture is the externally-pre-synthesized version used to test the project-zip detection branch in isolation.

---

## Hypothesis under test

H-010b (per `canon/encodings/transcript-encoded-session-7.md` continuation §H-010): if a SAB project zip is submitted (recognizable by `*.appDef` at root), and the container detects it and uses `scripture-app-builder -load build.appDef -build` instead of `-new -b`, will SAB v14.0 build 129 produce a real APK?

This tests the "production path" that SIL's own `appbuilder-buildengine-api/scripts/upload/default/build.sh` uses. If H-010b confirms, then H-010c (auto-synthesizing from raw USFM internally) is structurally the same code path with one extra step.

If H-010b falsifies (project zip + `-load` also fails), the failure mode tells us whether SAB needs additional `.appDef` elements beyond what we synthesized, what `<features>` are mandatory, etc.

---

## Submission

Submitted with `kind: "usfm_zip"` even though the contents are a project — the container distinguishes by zip contents, not by the kind discriminator. The kind discriminator remains the agent-facing contract (per the v1.x spec); it does not control container routing.
