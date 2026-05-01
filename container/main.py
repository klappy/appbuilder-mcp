"""
AppBuilder MCP Container — FastAPI HTTP handler.

Endpoints:
  GET  /health        — liveness probe
  POST /jobs          — run a Scripture App Builder build end-to-end

v0.1 PoC scope (per canon/specs/appbuilder-mcp-v1-spec.md §3):
  - SAB only.
  - APK output only.
  - Bundled debug keystore as Phase-0 floor; caller can override via payload.
  - USFM/USX zip input via -b flag. Burrito-capable upstream tag will arrive
    separately and is a Container-only swap (no Worker change).

State callback pattern (mirrors ptxprint-mcp): the Container does NOT have
direct access to the JobStateDO. It calls back through the Worker's internal
routes:

  POST {worker_callback_url}                  → patch job state
  PUT  {worker_callback_url%/internal/...}/internal/upload?key=... → upload artifact

The worker_callback_url is provided by the Worker in the job submission body
and takes the shape `https://<worker>/internal/job-update`.

Provenance: structural pattern derived from
klappy://canon/specs/ptxprint-mcp-v1.2-spec §5 and
ptxprint-mcp/container/main.py. AppBuilder-specific changes are isolated to
(a) the CLI invocation in run_scripture_app_builder() and (b) the payload
schema + asset-staging logic.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("appbuilder-container")

app = FastAPI(title="appbuilder-mcp container", version="0.1.0")


# ---------- Schema (mirror of src/payload.ts; see that file for canonical definitions) ----------


class BibleSourceModel(BaseModel):
    """Bible content the SAB CLI will accept as -b argument.

    v1.1 supports kind ∈ {"usfm_zip", "usx_zip", "burrito_zip"}. Burrito
    support arrived in session 4 by pinning the staging branch
    `appbuilder-agent-stg:feature-scripture-burrito` (D-009; closes H-001).
    The Container forwards the zip to SAB via -b regardless of kind; SAB's
    burrito branch auto-detects the format from the zip contents.
    """

    kind: str  # "usfm_zip" | "usx_zip" | "burrito_zip"
    url: str
    sha256: str


class IconModel(BaseModel):
    """One app icon. SAB takes -ic <path> repeatedly for multiple sizes."""

    filename: str  # e.g. "icon-144.png"
    url: str
    sha256: str


class KeystoreModel(BaseModel):
    """Caller-provided keystore. Optional — when absent, the bundled debug
    keystore (env APPBUILDER_DEBUG_KEYSTORE) is used.
    """

    keystore_url: str
    keystore_sha256: str
    info_url: str  # the .txt info file with passwords/alias
    info_sha256: str


class PayloadModel(BaseModel):
    schema_version: str
    name: str
    package: str
    bible_source: BibleSourceModel
    about_url: str | None = None
    about_sha256: str | None = None
    icons: list[IconModel] = Field(default_factory=list)
    keystore: KeystoreModel | None = None
    build_modern_pwa: bool = False  # SAB -build-modern-pwa flag (PWA still produces APK in v0.1)


class JobBody(BaseModel):
    job_id: str
    payload: PayloadModel
    payload_hash: str
    apk_r2_key: str
    log_r2_key: str
    worker_callback_url: str | None


# ---------- Utilities ----------


async def patch_state(
    callback_url: str | None,
    job_id: str,
    patch: dict[str, Any],
) -> None:
    """POST a state patch to the Worker's /internal/job-update.

    Silently no-ops when callback_url is None (jobs appear stuck at queued
    in that case — same gotcha as ptxprint-mcp; surfaced loudly in the spec).
    """
    if not callback_url:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                callback_url,
                json={"job_id": job_id, "patch": patch},
            )
    except Exception:
        log.warning("patch_state failed (best-effort): %s", traceback.format_exc())


async def fetch_and_verify(url: str, sha256_expected: str, dest: Path) -> None:
    """Stream a URL to dest and verify sha256. Raises on mismatch."""
    h = hashlib.sha256()
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as r:
            r.raise_for_status()
            with dest.open("wb") as f:
                async for chunk in r.aiter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)
                    h.update(chunk)
    got = h.hexdigest()
    if got.lower() != sha256_expected.lower():
        raise ValueError(f"sha256 mismatch for {url}: expected {sha256_expected}, got {got}")


def upload_url_for(callback_url: str, key: str) -> str:
    """Derive the /internal/upload URL from the callback URL."""
    base = callback_url.rstrip("/")
    if base.endswith("/internal/job-update"):
        base = base[: -len("/internal/job-update")]
    return f"{base}/internal/upload?key={key}"


async def upload_artifact(
    callback_url: str | None,
    key: str,
    body: bytes,
    content_type: str,
) -> None:
    if not callback_url:
        return
    url = upload_url_for(callback_url, key)
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.put(url, content=body, headers={"content-type": content_type})
        r.raise_for_status()


# ---------- The build pipeline ----------


def find_apk(build_dir: Path) -> Path | None:
    """SAB writes APKs in two places, depending on the -fp flags:

      <build_dir>/.../*-release.apk    — the gradle-built APK (intermediate)
      <work_dir>/apk_out/<name>.apk    — SAB's "Copying APK to output folder" target
                                          when -fp apk.output=<work_dir>/apk_out is set

    Search both. The work_dir is the parent of build_dir per the convention
    in run_scripture_app_builder. Apk_out is the canonical caller-facing
    artifact (signed, version-stamped); the gradle-stage APK is a build
    intermediate. Prefer apk_out when present.
    """
    work_dir = build_dir.parent
    apk_out = work_dir / "apk_out"
    if apk_out.is_dir():
        candidates = list(apk_out.glob("*.apk"))
        if candidates:
            candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return candidates[0]
    candidates = list(build_dir.rglob("*.apk"))
    if candidates:
        candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return candidates[0]
    return None


def detect_bundle_shape(zip_path: Path) -> str:
    """Inspect a bible-bundle zip and classify its shape.

    Returns one of:
      'project' — already a SAB project (has *.appDef at root + matching _data/)
      'dbl'     — DBL Text Release Bundle (metadata.xml + release/USX_*/*.usx)
      'usfm'    — bare USFM files at the zip root (no project metadata)
      'usx'     — bare USX files at the zip root (no DBL metadata)
      'unknown' — something else; fall back to legacy -new -b path

    H-009 (session 7) and H-010a (session 7 cont.) together established
    that SAB v14.0 build 129's -new -b path populates book collection 1
    only for DBL-shaped inputs. Bare USFM zips need a project synthesis
    step before SAB will accept them via -load. This function makes that
    routing decision.
    """
    import zipfile
    try:
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
    except zipfile.BadZipFile:
        return "unknown"

    # Filter out directory entries
    file_names = [n for n in names if not n.endswith("/")]

    def at_root(name: str) -> bool:
        return "/" not in name

    # Project: any *.appDef at root
    if any(at_root(n) and n.lower().endswith(".appdef") for n in file_names):
        return "project"

    # DBL bundle: metadata.xml at root + at least one release/USX_*/*.usx
    if any(n == "metadata.xml" for n in file_names) and any(
        n.startswith("release/USX_") and n.lower().endswith(".usx") for n in file_names
    ):
        return "dbl"

    # Bare USFM: at least one *.usfm at root
    if any(at_root(n) and n.lower().endswith(".usfm") for n in file_names):
        return "usfm"

    # Bare USX: at least one *.usx at root (rare — most USX comes inside DBL bundles)
    if any(at_root(n) and n.lower().endswith(".usx") for n in file_names):
        return "usx"

    return "unknown"


# USFM 3.0 canonical book order — used to sort <book> entries in the synthesized
# .appDef. Entries with codes not in this list (peripheral material like FRT,
# GLO, DAG) sort to the end in filename order.
_USFM_CANONICAL_ORDER = [
    "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI",
    "1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER",
    "LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP",
    "HAG","ZEC","MAL",
    "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL",
    "1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN",
    "3JN","JUD","REV",
    "TOB","JDT","ESG","WIS","SIR","BAR","LJE","S3Y","SUS","BEL","1MA","2MA",
    "3MA","4MA","1ES","2ES","MAN","PS2","ODA","PSS","DAG",
]
_USFM_ORDER_MAP = {code: i for i, code in enumerate(_USFM_CANONICAL_ORDER)}

_OT_CODES = set(_USFM_CANONICAL_ORDER[:39])
_NT_CODES = set(_USFM_CANONICAL_ORDER[39:66])


def _parse_usfm_markers(usfm_path: Path) -> dict[str, str]:
    """Pull \\id, \\h, \\toc1, \\toc2, \\toc3 from the head of a USFM file.

    Reads only until \\c (chapter content) — book metadata always lives
    above the first chapter marker.
    """
    rec = {"code": "", "h": "", "toc1": "", "toc2": "", "toc3": ""}
    try:
        with usfm_path.open("r", encoding="utf-8", errors="replace") as f:
            for raw in f:
                line = raw.strip()
                if not line:
                    continue
                if line.startswith("\\id "):
                    parts = line.split(None, 2)
                    if len(parts) >= 2:
                        rec["code"] = parts[1].strip().upper()
                elif line.startswith("\\h "):
                    rec["h"] = line[3:].strip()
                elif line.startswith("\\toc1 "):
                    rec["toc1"] = line[6:].strip()
                elif line.startswith("\\toc2 "):
                    rec["toc2"] = line[6:].strip()
                elif line.startswith("\\toc3 "):
                    rec["toc3"] = line[6:].strip()
                if line.startswith("\\c "):
                    break
    except OSError:
        pass
    return rec


def _xml_attr_escape(s: str) -> str:
    """XML attribute value escaping (& < > " ')."""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _xml_text_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def synthesize_project_from_usfm(
    bible_zip: Path,
    project_dir: Path,
    *,
    name: str,
    package: str,
) -> Path:
    """Wrap a bare-USFM zip into a SAB project structure.

    Layout produced (matching what SIL's appbuilder-buildengine-api
    expects per its build.sh's prepare_appbuilder_project):

      project_dir/
        build.appDef                     ← project XML, <books id="C01"> populated
        build_data/
          books/
            <each *.usfm from the input zip>

    The `.appDef` is intentionally minimal — only the elements that
    sessions 6/7 evidence shows are required for `-load build.appDef
    -build` to populate book collection 1. SAB fills in defaults for
    everything else when -build runs.

    Returns the path to the .appDef file.

    Provenance for the <books id="C01"> shape: confirmed against
    sil-car/sango-transition-guide-app/Sango Transition Guide.appDef
    and WycliffeAssociates/AudioSABbuilder/resources/bible.appDef.
    Mapping (long/short/abbr from \\toc1/2/3): SIL "Building Apps"
    PDF §4.8 page 31.
    """
    import zipfile

    project_dir.mkdir(parents=True, exist_ok=True)
    data_dir = project_dir / "build_data"
    books_dir = data_dir / "books"
    books_dir.mkdir(parents=True, exist_ok=True)

    # Extract every *.usfm in the input zip (flat at root) into build_data/books/.
    # Non-USFM files at the root (e.g. copr.htm, gentiumplus.css, keys.asc,
    # signature.txt.asc from the eBible bundles) are also copied — they are
    # not consumed by SAB but their presence does no harm and preserves the
    # caller's bundle integrity.
    extracted_usfm: list[str] = []
    with zipfile.ZipFile(bible_zip) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            base = os.path.basename(info.filename)
            if not base:
                continue
            if base.lower().endswith(".usfm"):
                target = books_dir / base
                with zf.open(info) as src, target.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted_usfm.append(base)
            else:
                # Auxiliary files (license, signatures, fonts) — preserve at
                # data root for caller transparency. SAB ignores them.
                target = data_dir / base
                with zf.open(info) as src, target.open("wb") as dst:
                    shutil.copyfileobj(src, dst)

    # Parse marker fields out of each USFM file.
    book_records: list[dict[str, str]] = []
    for fname in extracted_usfm:
        rec = _parse_usfm_markers(books_dir / fname)
        if not rec["code"]:
            log.warning("synthesize_project: skipping %s — no \\id marker", fname)
            continue
        rec["filename"] = fname
        book_records.append(rec)

    # Sort: canonical USFM order first; unknown codes (FRT, GLO, etc.) last
    # in filename order.
    book_records.sort(
        key=lambda r: (_USFM_ORDER_MAP.get(r["code"], 10_000), r["filename"])
    )

    # Build the .appDef document.
    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="utf-8"?>')
    lines.append('<app-definition type="SAB" program-version="14.0">')
    lines.append(f"  <project-name>{_xml_text_escape(name)}</project-name>")
    lines.append("  <project-description></project-description>")
    lines.append(f'  <app-name lang="default">{_xml_text_escape(name)}</app-name>')
    lines.append('  <apk-filename append-version="true">app.apk</apk-filename>')
    lines.append(f"  <package>{_xml_text_escape(package)}</package>")
    lines.append('  <version code="1" name="1.0"/>')
    lines.append('  <multiple-apks value="false"/>')
    lines.append('  <android-sdk min="21"/>')
    lines.append("")
    lines.append('  <about enabled="true">')
    lines.append("    <filename>about.txt</filename>")
    lines.append("  </about>")
    lines.append("")
    lines.append('  <books id="C01">')
    lines.append("    <book-collection-name>Main Collection</book-collection-name>")
    lines.append("")
    for rec in book_records:
        code = rec["code"]
        long_  = rec["toc1"] or rec["h"] or code
        short_ = rec["toc2"] or rec["h"] or code
        abbr_  = rec["toc3"] or short_[:3]
        group  = "OT" if code in _OT_CODES else ("NT" if code in _NT_CODES else "")
        lines.append(f'    <book id="{_xml_attr_escape(code)}">')
        lines.append(f"      <name>{_xml_text_escape(short_)}</name>")
        lines.append(f"      <abbrev>{_xml_text_escape(abbr_)}</abbrev>")
        if group:
            lines.append(f"      <group>{group}</group>")
        lines.append(f"      <filename>{_xml_text_escape(rec['filename'])}</filename>")
        lines.append("    </book>")
    lines.append("  </books>")
    lines.append("</app-definition>")
    lines.append("")

    appdef = project_dir / "build.appDef"
    appdef.write_bytes("\n".join(lines).encode("utf-8"))
    log.info(
        "synthesize_project: wrote %s (%d books, %d aux files)",
        appdef,
        len(book_records),
        sum(1 for f in data_dir.iterdir() if f.is_file()),
    )
    return appdef


def extract_project_zip(bible_zip: Path, project_dir: Path) -> Path:
    """Extract a SAB-project zip and return the path to its .appDef.

    Caller-supplied project zips are expected to contain:
      <name>.appDef          (XML project file)
      <name>_data/...        (data tree referenced by the .appDef)

    The .appDef is renamed to build.appDef (and the matching _data/
    folder to build_data/) to match the convention used by SIL's
    appbuilder-buildengine-api/scripts/upload/default/build.sh.
    """
    import zipfile

    project_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(bible_zip) as zf:
        zf.extractall(project_dir)

    # Find the *.appDef at the extracted root (or in a single subdir if the
    # zip had a wrapping folder).
    candidates = list(project_dir.glob("*.appDef"))
    if not candidates:
        for sub in project_dir.iterdir():
            if sub.is_dir():
                candidates = list(sub.glob("*.appDef"))
                if candidates:
                    project_dir = sub
                    break
    if not candidates:
        raise ValueError(
            "extract_project_zip: bundle was classified as 'project' but no .appDef found"
        )
    appdef = candidates[0]
    proj_name = appdef.stem
    data_dir_src = project_dir / f"{proj_name}_data"
    if not data_dir_src.is_dir():
        # Some project zips name the data folder loosely — fall back to any
        # matching <name>_data with relaxed casing.
        for d in project_dir.iterdir():
            if d.is_dir() and d.name.lower() == f"{proj_name.lower()}_data":
                data_dir_src = d
                break
    # Rename to the build.appDef + build_data convention SIL's pipeline uses.
    target_appdef = project_dir / "build.appDef"
    target_data = project_dir / "build_data"
    if appdef != target_appdef:
        appdef.rename(target_appdef)
    if data_dir_src.exists() and data_dir_src != target_data:
        data_dir_src.rename(target_data)
    log.info("extract_project_zip: build.appDef ready at %s", target_appdef)
    return target_appdef


async def run_scripture_app_builder(
    payload: PayloadModel,
    work_dir: Path,
) -> tuple[int, str, Path | None]:
    """Materialize assets in work_dir, then exec scripture-app-builder.

    Returns (exit_code, log_text, apk_path_or_None).

    Two CLI invocation paths, chosen by the bible-bundle shape:

      ┌ shape  ┬ invocation                                            ┐
      │ usfm   │ -load <synth>/build.appDef -build  (H-010c synthesis) │
      │ project│ -load <extracted>/build.appDef -build  (H-010b)       │
      │ dbl    │ -new -n .. -p .. -b <bundle> -build (H-010a confirmed)│
      │ usx    │ -new -n .. -p .. -b <bundle> -build (legacy path)     │
      │ unknown│ -new -n .. -p .. -b <bundle> -build (legacy path)     │
      └────────┴───────────────────────────────────────────────────────┘

    Per evidence: SAB v14.0 build 129's -new -b path populates book
    collection 1 reliably for DBL-shaped inputs (H-010a, session 7
    cont.) but not for bare USFM zips (H-009 falsified the BookNames.xml
    fix). The synthesis path (H-010c) wraps bare USFM zips into a
    minimal SAB project on the fly, then uses -load — the production
    path used by SIL's own appbuilder-buildengine-api.

    The `-i <additional-params-file>` is NOT a keystore-info file — it's
    a flat list of CLI flags (per PDF §4.14). For the bundled debug
    keystore we ship `-ksp <storepass>\\n-ka <alias>\\n-kap <keypass>\\n`
    (see Dockerfile).
    """
    assets = work_dir / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    build_out = work_dir / "build"
    build_out.mkdir(parents=True, exist_ok=True)

    # Bible source. Preserve the URL basename when sensible — SAB's `-b`
    # appears to use filename heuristics for content sniffing. Falling back
    # to a deterministic name only when the URL has no usable basename.
    from urllib.parse import urlparse
    url_basename = os.path.basename(urlparse(payload.bible_source.url).path) or ""
    if url_basename and url_basename.lower().endswith(".zip"):
        bible_filename = url_basename
    else:
        bible_filename = f"bible.{payload.bible_source.kind.replace('_zip', '')}.zip"
    bible_dest = assets / bible_filename
    await fetch_and_verify(payload.bible_source.url, payload.bible_source.sha256, bible_dest)

    # Classify the bundle.
    shape = detect_bundle_shape(bible_dest)
    log.info("Bundle %s classified as shape=%s (kind=%s)", bible_filename, shape, payload.bible_source.kind)

    # About (optional; SAB will use a default if absent)
    about_path: Path | None = None
    if payload.about_url and payload.about_sha256:
        about_path = assets / "about.txt"
        await fetch_and_verify(payload.about_url, payload.about_sha256, about_path)

    # Icons (optional; SAB will use a default if absent)
    icon_paths: list[Path] = []
    for ic in payload.icons:
        dest = assets / ic.filename
        await fetch_and_verify(ic.url, ic.sha256, dest)
        icon_paths.append(dest)

    # Keystore — caller-provided, or fall back to bundled debug keystore.
    if payload.keystore:
        ks_path = assets / "keystore.keystore"
        ks_info = assets / "keystore.txt"
        await fetch_and_verify(payload.keystore.keystore_url, payload.keystore.keystore_sha256, ks_path)
        await fetch_and_verify(payload.keystore.info_url, payload.keystore.info_sha256, ks_info)
    else:
        ks_path = Path(os.environ.get("APPBUILDER_DEBUG_KEYSTORE", "/app-builders/debug-keystore/debug.keystore"))
        ks_info = Path(os.environ.get("APPBUILDER_DEBUG_KEYSTORE_INFO", "/app-builders/debug-keystore/debug.properties"))

    # Assemble the CLI invocation based on shape.
    project_dir = work_dir / "project"
    if shape == "project":
        appdef = extract_project_zip(bible_dest, project_dir)
        # If caller also supplied an about.txt, drop it next to the .appDef
        # so the .appDef's <about><filename>about.txt</filename> resolves.
        if about_path:
            shutil.copy2(about_path, project_dir / "build_data" / "about.txt")
        cmd: list[str] = [
            "scripture-app-builder",
            "-load", str(appdef),
            "-no-save",
            "-ks", str(ks_path),
            "-i", str(ks_info),
        ]
    elif shape == "usfm":
        appdef = synthesize_project_from_usfm(
            bible_dest, project_dir, name=payload.name, package=payload.package
        )
        if about_path:
            shutil.copy2(about_path, project_dir / "build_data" / "about.txt")
        cmd = [
            "scripture-app-builder",
            "-load", str(appdef),
            "-no-save",
            "-ks", str(ks_path),
            "-i", str(ks_info),
        ]
    else:
        # 'dbl', 'usx', 'unknown' — the legacy -new -b path. H-010a confirmed
        # this works for DBL bundles in build 129.
        cmd = [
            "scripture-app-builder",
            "-new",
            "-n", payload.name,
            "-p", payload.package,
            "-b", str(bible_dest),
            "-ks", str(ks_path),
            "-i", str(ks_info),
        ]

    if about_path and shape not in ("project", "usfm"):
        # For -load paths, about.txt is referenced from the .appDef; for
        # -new paths it's a CLI argument.
        cmd += ["-a", str(about_path)]
    for ic in icon_paths:
        cmd += ["-ic", str(ic)]
    if payload.build_modern_pwa:
        cmd += ["-build-modern-pwa"]
    # Two -fp tokens are required to land an APK where find_apk() looks:
    #   build=<dir>      — SAB scratch dir for intermediate gradle output
    #   apk.output=<dir> — where SAB copies the final signed APK after build
    # Without apk.output, SAB defaults to ~/App\ Builder/<AppType>/Apk\ Output/
    # which lives outside our work_dir. The H-002-closure smoke caught this:
    # SAB reported "Android APK built successfully" + "Copying APK to output
    # folder" but find_apk() returned None because the APK was at
    # /root/App\ Builder/Scripture\ Apps/Apk\ Output/, not under build_out.
    # SIL's own appbuilder-buildengine-api/scripts/upload/default/build.sh
    # passes both -fp build=... and -fp apk.output=... for the same reason.
    apk_out = work_dir / "apk_out"
    apk_out.mkdir(parents=True, exist_ok=True)
    cmd += ["-fp", f"build={build_out}"]
    cmd += ["-fp", f"apk.output={apk_out}"]
    cmd += ["-build"]

    log.info("Running SAB (shape=%s): %s", shape, " ".join(cmd))

    env = os.environ.copy()
    env.setdefault("HOME", "/root")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env=env,
    )
    stdout_bytes, _ = await proc.communicate()
    log_text = stdout_bytes.decode("utf-8", errors="replace")
    exit_code = proc.returncode if proc.returncode is not None else -1

    # Prepend the shape decision + invocation to the log so it's visible in
    # the operator-facing log_tail without needing container stdout access.
    header = (
        f"[appbuilder-mcp container] bundle shape: {shape}\n"
        f"[appbuilder-mcp container] invocation:  {' '.join(cmd)}\n"
        f"--- SAB output below ---\n"
    )
    log_text = header + log_text

    apk = find_apk(build_out)
    return exit_code, log_text, apk


def classify_failure(exit_code: int, apk: Path | None, log_text: str) -> str:
    """Three failure modes, mirroring ptxprint-mcp's pattern.

    - hard:    process crashed, no APK produced.
    - soft:    APK produced but log surfaces error/warning patterns we treat
               as quality regressions (e.g. unsigned APK, missing icons).
    - success: APK produced, no soft-failure markers.
    """
    if exit_code != 0 or apk is None:
        return "hard"
    # v0.1 soft markers (heuristic; refine in canon/articles/failure-mode-taxonomy.md)
    soft_markers = [
        "WARNING: Failed to sign",
        "FAILED",
        "BUILD FAILED",
    ]
    log_lower = log_text.lower()
    for m in soft_markers:
        if m.lower() in log_lower:
            return "soft"
    return "success"


# ---------- Endpoints ----------


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "service": "appbuilder-mcp container", "version": "0.1.0"})


@app.post("/jobs")
async def run_job(body: JobBody, request: Request) -> JSONResponse:
    job_id = body.job_id
    callback_url = body.worker_callback_url

    log.info("Job %s starting (payload_hash=%s)", job_id, body.payload_hash)

    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    await patch_state(
        callback_url,
        job_id,
        {
            "state": "running",
            "started_at": started_at,
            "human_summary": "Container: starting Scripture App Builder build.",
        },
    )

    work_dir = Path(tempfile.mkdtemp(prefix=f"appbuilder-{job_id}-"))
    try:
        exit_code, log_text, apk = await run_scripture_app_builder(body.payload, work_dir)
        failure_mode = classify_failure(exit_code, apk, log_text)

        # Upload log unconditionally (it's diagnostic for failures).
        await upload_artifact(
            callback_url,
            body.log_r2_key,
            log_text.encode("utf-8"),
            "text/plain; charset=utf-8",
        )

        if apk is not None:
            apk_bytes = apk.read_bytes()
            await upload_artifact(
                callback_url,
                body.apk_r2_key,
                apk_bytes,
                "application/vnd.android.package-archive",
            )

        completed_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        terminal_state = "succeeded" if failure_mode == "success" else "failed"
        await patch_state(
            callback_url,
            job_id,
            {
                "state": terminal_state,
                "completed_at": completed_at,
                "exit_code": exit_code,
                "failure_mode": failure_mode,
                "apk_r2_key": body.apk_r2_key if apk is not None else None,
                "log_r2_key": body.log_r2_key,
                "log_tail": log_text[-4000:],
                "human_summary": (
                    f"Container: SAB exit {exit_code}, failure_mode={failure_mode}"
                    + (f", apk={apk.name}" if apk else ", no apk produced")
                ),
            },
        )

        return JSONResponse(
            {
                "ok": True,
                "exit_code": exit_code,
                "failure_mode": failure_mode,
                "apk_uploaded": apk is not None,
            }
        )
    except Exception as e:
        log.exception("Job %s threw: %s", job_id, e)
        await patch_state(
            callback_url,
            job_id,
            {
                "state": "failed",
                "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "failure_mode": "hard",
                "exit_code": -1,
                "errors": [f"container threw: {type(e).__name__}: {e}"],
                "log_tail": traceback.format_exc()[-4000:],
                "human_summary": f"Container: exception during build — {type(e).__name__}",
            },
        )
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)
    finally:
        # Clean scratch dir to keep the container's writable layer small across
        # consecutive jobs in the same instance (sleepAfter window).
        shutil.rmtree(work_dir, ignore_errors=True)
