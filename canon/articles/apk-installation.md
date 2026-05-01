---
uri: klappy://canon/articles/apk-installation
title: "APK Installation — Delivering a Build Output to a Phone"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "mcp", "agent-kb", "v1", "sab", "apk", "android", "side-loading", "end-user"]
companion_to: "canon/articles/payload-construction.md, canon/articles/failure-mode-taxonomy.md"
applied_canon:
  - "klappy://canon/principles/maintainability-one-person-indefinitely"
canonical_status: non_canonical
date: 2026-04-30
provenance: "Promoted from canon/surfaces/Scripture-App-Builder-02-Building-Apps.surface.md (pages 22-27 §3) per ESE §Promotion Rule. Authority: SIL PDF §3."
---

# APK Installation — Delivering a Build Output to a Phone

> **What this answers.** When `get_job_status` returns an `apk_url`, how does the end user get that APK onto an Android phone? What warnings should the agent prepare them for?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/failure-mode-taxonomy` · `klappy://canon/articles/keystore-reuse`

---

## What the MCP returns

A successful `submit_build` → `get_job_status` cycle ends with:

```
{
  "state": "succeeded",
  "apk_url": "https://appbuilder-mcp.klappy.workers.dev/r2/outputs/<hash>/<package>_<sanitized-name>_appbuilder.apk",
  "log_url":  "https://appbuilder-mcp.klappy.workers.dev/r2/outputs/<hash>/<package>_<sanitized-name>_appbuilder.log"
}
```

The `apk_url` is a stable, content-addressed reference. Anyone with the URL can download the APK directly.

The MCP **does not push** the APK to a device. Delivery is the agent's (or end user's) responsibility, and that's what this article covers.

## Three documented installation paths (PDF §3, pages 22–27)

SAB's manual documents three ways to get an APK onto a phone. None require the Play Store.

### 1. WiFi transfer

Use a phone-to-computer file-transfer app (Xender, WhatsApp, AirDroid, etc.). Download the APK to a computer first, then send it to the phone via the transfer app. On the phone, open the file and tap to install.

**Best for:** users with a computer in the loop and a transfer app already installed.

### 2. Direct USB copy

Connect the phone to a computer with a USB **data** cable (charge-only cables don't work). The phone shows up as a storage device. Copy the APK to a known folder on the phone (e.g. `Downloads/`), then on the phone find the file and tap to install.

**Best for:** users with cable access and no transfer app.

### 3. Direct download on the phone

The phone's browser can download the `apk_url` directly. After the download completes, tap the file in the browser's downloads tray or in `Downloads/`.

**Best for:** users with no computer in the loop. This is the simplest path for most modern Android users — and the agent can deliver it as a single tap-to-install URL.

(Note: §3 of the PDF documents a fourth path — SAB's "Install APK" toolbar button — but that requires SAB itself to be installed on the user's computer with USB Debugging enabled on the phone. Not applicable when the build came from this MCP rather than from a local SAB install.)

## Warnings the agent should pre-flight

### Side-load warnings

Side-loading (installing outside Play Store) triggers Android security prompts. PDF page 22 acknowledges this:

> "Because you are installing your APK directly (a process called side-loading) instead of through the Play Store, your phone may alert you to the fact that this is a suspicious file and require an extra step for permitting the install and/or a virus scan. This is normal."

The agent should warn the user before delivering the APK URL: *"Your phone may show a security prompt asking if you trust the source. Tap Install or Allow anyway to proceed."*

### "Install from unknown sources" permission

On Android 8+, the user must explicitly grant the *delivering app* (browser, file manager) permission to install APKs. The first time, the phone redirects to a settings screen for the relevant app. Subsequent installs from the same app skip this.

### Debug-signed warnings

If the build used the Container's bundled debug keystore (no `keystore` field in the payload), some Android devices and antivirus apps flag debug-signed APKs more aggressively than release-signed ones. For production distribution, supply a real keystore — see [`keystore-reuse.md`](klappy://canon/articles/keystore-reuse).

## What the MCP cannot help with

- **Play Store distribution.** Requires an Android Developer account, Play Console upload, and release-signed APK or AAB. The MCP produces an APK; uploading it is out of scope.
- **APK signature verification on the user side.** Android already does this on install; the agent should not duplicate the check.
- **OTA updates.** Once installed, the app updates only when the user installs a new APK (signed by the same keystore). There is no automatic update path for side-loaded apps.

## See also

- `klappy://canon/articles/payload-construction` — building the `submit_build` payload
- `klappy://canon/articles/failure-mode-taxonomy` — interpreting `get_job_status` errors before delivery
- `klappy://canon/articles/keystore-reuse` — production-signing keystores
- `klappy://canon/surfaces/sab-building-apps` — surface over PDF §3 pages 22–27
