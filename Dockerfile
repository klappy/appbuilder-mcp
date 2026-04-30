# syntax=docker/dockerfile:1
#
# AppBuilder MCP container.
#
# Two-stage layered design that mirrors what sillsdev/docker-appbuilder-agent does
# (FROM ghcr.io/sillsdev/app-builders:<tag> AS builder, then COPY into a slim base),
# but adapted for our needs:
#
#   1. Pull the upstream sillsdev/app-builders image, which provides the four
#      build CLIs (scripture-app-builder, reading-app-builder,
#      dictionary-app-builder, keyboard-app-builder) plus the Android SDK,
#      JDK, Gradle, fontconfig, and so on. v0.1 uses :latest; the
#      burrito-capable tag will be pinned in once delivered (see
#      canon/handoffs/burrito-tag-handoff.md).
#
#   2. Layer a Python FastAPI HTTP handler on top so the Cloudflare Container
#      can receive POST /jobs invocations, run scripture-app-builder, classify
#      the result, and stream the APK to R2.
#
# v0.1 PoC scope (per canon/specs/appbuilder-mcp-v1-spec.md §3):
#   - SAB only.
#   - APK only.
#   - Bundled debug keystore as the Phase-0 floor (caller can override).
#   - USFM/USX zip input via -b flag (burrito support deferred to the
#     burrito-capable upstream tag — Container-only swap, no Worker change).
#
# Authority: canon/specs/appbuilder-mcp-v1-spec.md §5 (container shape).
# Provenance: derived from ptxprint-mcp/Dockerfile pattern (FROM upstream +
# layer FastAPI), with the upstream/CLI swap and signing-keystore stage
# being the only structural differences.

ARG APP_BUILDERS_TAG=latest
FROM ghcr.io/sillsdev/app-builders:${APP_BUILDERS_TAG} AS upstream

# ---------- Final image ----------

FROM ghcr.io/sillsdev/app-builders:${APP_BUILDERS_TAG}

LABEL maintainer="klappy" \
  org.opencontainers.image.source="https://github.com/klappy/appbuilder-mcp" \
  org.opencontainers.image.description="appbuilder-mcp container — wraps Scripture App Builder CLI behind a FastAPI HTTP handler"

# Install Python + minimal HTTP-handler dependencies. The upstream image is
# Ubuntu-based (jammy); python3 is available via apt.
RUN apt-get update \
 && apt-get install --no-install-recommends -y \
      python3 python3-pip python3-venv ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# FastAPI HTTP handler layer
COPY container/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r /app/requirements.txt

COPY container/main.py /app/main.py

# ---------- Bundled debug keystore (Phase-0 floor) ----------
#
# The Container ships with a debug keystore so a payload of the absolute
# minimum {name, package, bible_url} produces a signed-with-debug APK with
# no caller-side signing setup. This is the SAB analog of ptxprint-mcp's
# bundled default cfg pattern. Production builds MUST override.
#
# Authority: canon/articles/bundled-debug-keystore.md.
# The keystore itself is generated at build time below to avoid committing
# binary artifacts. The password and alias are baked into the container so
# the FastAPI handler can pass them to scripture-app-builder via -ks/-i.
RUN mkdir -p /app-builders/debug-keystore \
 && keytool -genkey -v \
      -keystore /app-builders/debug-keystore/debug.keystore \
      -alias appbuilder-mcp-debug \
      -keyalg RSA -keysize 2048 \
      -validity 10000 \
      -storepass appbuilder-mcp-debug \
      -keypass appbuilder-mcp-debug \
      -dname "CN=appbuilder-mcp debug, OU=appbuilder-mcp, O=klappy, L=Unknown, ST=Unknown, C=US" \
 && printf 'storePassword=appbuilder-mcp-debug\nkeyAlias=appbuilder-mcp-debug\nkeyPassword=appbuilder-mcp-debug\n' \
      > /app-builders/debug-keystore/debug.properties \
 && chmod 644 /app-builders/debug-keystore/*

ENV APPBUILDER_DEBUG_KEYSTORE=/app-builders/debug-keystore/debug.keystore \
    APPBUILDER_DEBUG_KEYSTORE_INFO=/app-builders/debug-keystore/debug.properties \
    PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info", "--app-dir", "/app"]
