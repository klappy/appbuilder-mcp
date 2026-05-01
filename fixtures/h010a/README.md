# H-010a Test Fixture — eng-bsb_usx.zip (DBL Text Release Bundle)

> Purpose: empirical test of H-010a (`canon/encodings/transcript-encoded-session-7.md` continuation §H-010). Tests whether SAB v14.0 build 129's `-new -b <bundle> -build` workflow succeeds with a proper DBL Text Release Bundle even though it fails with a bare USFM zip (H-009 evidence).

---

## Provenance

This file is a verbatim copy of `eng-bsb_usx.zip` from [`sillsdev/docker-appbuilder-agent`](https://github.com/sillsdev/docker-appbuilder-agent/blob/master/ansible/roles/app-builders/files/eng-bsb_usx.zip), the upstream container repository.

- Upstream URL: `https://raw.githubusercontent.com/sillsdev/docker-appbuilder-agent/master/ansible/roles/app-builders/files/eng-bsb_usx.zip`
- Mirror sha256: `37346add4e231de9ef24994d7e62c124f568e0784b1a76e82f359f7d69110236`
- Size: 2,050,794 bytes (2.0 MB compressed; ~9.3 MB uncompressed)
- 70 files: 1 `metadata.xml` + 66 `release/USX_1/<BOOK>.usx` + 1 `release/eng_en.ldml` + 1 `release/styles.xml` + 1 `release/versification.vrs`

We mirror it here rather than reaching across to the upstream URL during the smoke for two reasons: (a) auditability — the fixture sha256 is pinned to the commit that introduces it; (b) cache-busting independence — perturbing our local copy is straightforward, perturbing upstream is impolite.

---

## Hypothesis under test

H-010a (per `canon/encodings/transcript-encoded-session-7.md` continuation): SAB v14.0 build 129's `-new -b <bundle> -build` may succeed with a DBL Text Release Bundle (which carries `metadata.xml` as the book-name source per PDF §4.8) while failing with a raw USFM zip (per H-009 evidence: even with a generated `BookNames.xml`, collection 1 stays empty). If H-010a confirms, the v0.x agent-side workaround is "use a DBL bundle as input, not a raw USFM zip"; the durable container fix (H-010c) becomes lower priority.

If H-010a falsifies, both `kind` values are broken under `-new`, and H-010b (synthesize `.appDef` project + use `-load`) becomes the next move.

## Berean Standard Bible — copyright

The BSB content within this bundle is © Bible Hub / BSB Publishing, LLC, with publishing rights administered by the same. Per the bundle's own `metadata.xml` `<rightsHolder>` element. We mirror this fixture solely as a diagnostic input to test SAB's behavior — not as a redistribution of the BSB content itself. If the rights holder objects, this fixture should be removed and the smoke run against the upstream URL directly.
