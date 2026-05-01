---
uri: klappy://canon/articles/keystore-reuse
title: "Keystore Reuse — One Keystore for Many Apps"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "sab", "keystore", "signing", "android"]
companion_to: "canon/articles/bundled-debug-keystore.md, canon/articles/payload-construction.md"
applied_canon:
  - "klappy://canon/principles/dry-canon-says-it-once"
canonical_status: non_canonical
date: 2026-04-30
provenance: "Promoted from canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md (page 32 §4.9) per ESE §Promotion Rule. Authority: SIL PDF page 32; Android docs at developer.android.com/tools/publishing/app-signing.html."
---

# Keystore Reuse — One Keystore for Many Apps

> **What this answers.** Does each `submit_build` need a unique keystore, or can one keystore sign multiple apps? When does it matter?
>
> **Related articles.** `klappy://canon/articles/bundled-debug-keystore` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/cli-reference`

---

## The short answer

**One keystore can sign many apps.** SAB Building Apps PDF §4.9 (page 32) is explicit:

> "You can use the same keystore and key alias for all or several of your apps."

The Android signing rule is per-app, not per-build: once a given `package` (e.g. `org.ebible.web`) is published with a particular keystore, *that* keystore is the only one that can ever update *that* app. But a single keystore can be the signing identity for any number of distinct packages.

## Why this matters for `submit_build`

- For **debug-signed builds** (no `keystore` field in the payload): the Container's bundled debug keystore signs every job. This is fine for testing; it is *not* fine for distribution. Debug-signed APKs are not accepted by the Play Store and are flagged by side-load warnings on user devices.
- For **production-signed builds** (caller supplies `keystore` in the payload): one organization-owned keystore can be reused across many `package` values. The agent constructing the payload should treat the keystore reference (URL + sha256 + info-file URL + info-file sha256) as a stable per-organization asset, not a per-build asset.

A typical production agent flow:

1. Resolve the organization's keystore URL and sha256 once (e.g. from an internal secrets store or a passed-in capability).
2. Reuse the same `payload.keystore` block across every `submit_build` call for that organization.
3. The `package` value varies per app; the keystore stays the same.

## What the keystore secures

The keystore + key alias + alias password together form the signing identity. Three pieces of metadata flow into SAB's `-i` include file in the form documented on PDF page 38:

```
-ksp <keystore-password>
-ka  <key-alias>
-kap <alias-password>
```

The `-ks <filename>` flag points to the actual keystore file. The Container fetches both files (keystore + info file) over HTTPS, sha256-verifies them, and passes the local paths to SAB.

**Loss-of-keystore is unrecoverable.** PDF page 21 §2 step 19 warns: "Once the app is published, it cannot be updated without the keystore password. Make sure someone else in your organization has access to the app keystore passwords." A lost keystore means a lost app — users can install a new package, but never an update of the original.

## What this MCP does not do

- Does not generate keystores. Use Android's `keytool -genkey` or SAB's GUI Create KeyStore wizard.
- Does not store keystores. The caller hosts the keystore at an HTTPS URL the Container can fetch with sha256 verification.
- Does not rotate keystores. If a keystore is compromised, the affected apps cannot be updated; new packages must be created.

The Container's bundled debug keystore is *not* a managed-keystore feature — it exists only so debug builds complete without requiring the caller to host a throwaway keystore. See [`bundled-debug-keystore.md`](klappy://canon/articles/bundled-debug-keystore).

## See also

- `klappy://canon/articles/bundled-debug-keystore` — what the Container ships and when to override
- `klappy://canon/articles/payload-construction` — the `keystore` field schema
- `klappy://canon/articles/cli-reference` — full SAB CLI option table including `-ks/-ksp/-ka/-kap`
- `klappy://canon/surfaces/sab-building-apps` — surface over PDF page 32 §4.9
- Android signing reference: https://developer.android.com/tools/publishing/app-signing.html
