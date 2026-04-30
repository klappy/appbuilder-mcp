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
    """SAB writes APKs under <build_dir>/build/output/apk/... Find the latest one."""
    candidates = list(build_dir.rglob("*.apk"))
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


async def run_scripture_app_builder(
    payload: PayloadModel,
    work_dir: Path,
) -> tuple[int, str, Path | None]:
    """Materialize assets in work_dir, then exec scripture-app-builder.

    Returns (exit_code, log_text, apk_path_or_None).

    CLI surface, per SIL "Building Apps" PDF §4.14 (page 37–38). The
    docker-appbuilder-agent priming script omits `-build`, which is why
    H-002 first smoke caught a 4-second exit with no APK — `-new` alone
    creates the project on disk but does not compile. `-build` is the
    flag that tells SAB to actually build (works with either -new or
    -load).

      scripture-app-builder -new -n <name> -p <package> \\
        -b <bible.zip> \\
        -ks <keystore> -i <additional-params-file> \\
        [-a <about.txt>] \\
        [-ic <icon> -ic <icon> ...] \\
        [-build-modern-pwa] \\
        -fp build=<output-dir> \\
        -build

    The `-i <additional-params-file>` is NOT a keystore-info file — it's
    a flat list of CLI flags. For the bundled debug keystore we ship
    `-ksp <storepass>\\n-ka <alias>\\n-kap <keypass>\\n` (see Dockerfile).
    """
    assets = work_dir / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    build_out = work_dir / "build"
    build_out.mkdir(parents=True, exist_ok=True)

    # Bible source
    bible_dest = assets / f"bible.{payload.bible_source.kind.replace('_zip', '')}.zip"
    await fetch_and_verify(payload.bible_source.url, payload.bible_source.sha256, bible_dest)

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

    # Assemble the CLI invocation.
    cmd: list[str] = [
        "scripture-app-builder",
        "-new",
        "-n", payload.name,
        "-p", payload.package,
        "-b", str(bible_dest),
        "-ks", str(ks_path),
        "-i", str(ks_info),
    ]
    if about_path:
        cmd += ["-a", str(about_path)]
    for ic in icon_paths:
        cmd += ["-ic", str(ic)]
    if payload.build_modern_pwa:
        cmd += ["-build-modern-pwa"]
    cmd += ["-fp", f"build={build_out}"]
    # `-build` triggers actual compilation. Without it, SAB only creates
    # the project on disk and exits. Per SIL "Building Apps" PDF §4.14;
    # H-002 found this in session 5.
    cmd += ["-build"]

    log.info("Running SAB: %s", " ".join(cmd))

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
