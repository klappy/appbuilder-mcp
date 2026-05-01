# H-010 Full-Payload Fixture — Icon + About Files

> Purpose: complete the H-002 closure by adding the optional fields SAB requires when no `.appDef` pre-supplies them. Pairs with `fixtures/h009/eng-web_usfm_with_booknames.zip` (or any USFM bundle) under the H-010c container path.

## Files

- **`icon-72.png`** — 72x72 hdpi launcher icon. Verbatim mirror of `ab-001-black-72.png` from `sillsdev/docker-appbuilder-agent/ansible/roles/app-builders/files/`.
- **`icon-144.png`** — 144x144 xxhdpi launcher icon. Verbatim mirror of `ab-001-black-144.png` from the same source.
- **`about.txt`** — about-page text. Verbatim mirror of `about.txt` from the same source. Generic Public Domain / CC BY-NC 4.0 boilerplate used by SIL's own priming bundle.

These three files satisfy SAB v14.0 build 129's `-build` requirements for icon sizes (72x72 hdpi + 144x144 xxhdpi) and About content. Combined with the new container's auto-synthesis path (H-010c), a payload referencing the eng-web USFM bundle plus these auxiliaries should produce a complete signed APK.

The icons and about text are diagnostic-only mirrors — not contractual fixtures. Replace with real branding for any production app.
