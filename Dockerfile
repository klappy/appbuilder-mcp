# syntax=docker/dockerfile:1
#
# AppBuilder MCP container.
#
# Layered on the SIL App Builder Agent production image, which IS the
# operator-tested runtime SAB / RAB / DAB / KAB CLIs ship with. We add a
# Python FastAPI HTTP handler and a bundled debug keystore on top.
#
# Why agent-prd and not the bare app-builders image:
# `ghcr.io/sillsdev/app-builders` is a builder-stage carrier (single
# imported tarball layer, no shell, no Cmd, no entrypoint) — it cannot
# function as a runtime FROM base. Every RUN against it dies with
# `exec: "/bin/sh": stat /bin/sh: no such file or directory`. The
# operator's own docker-appbuilder-agent uses it only via
# `COPY --from=builder /` into a separate phusion/baseimage runtime, then
# layers ansible-installed Android SDK, JDK, Ruby, etc. The result of that
# whole pipeline is published as ghcr.io/sillsdev/appbuilder-agent-prd —
# which is exactly the runtime base we want.
#
# v0.1 PoC scope (per canon/specs/appbuilder-mcp-v1-spec.md §3):
#   - SAB only (RAB/DAB/KAB binaries are present in the image but unused).
#   - APK output only.
#   - Bundled debug keystore as Phase-0 floor; caller can override.
#   - USFM / USX / burrito zip input via -b. Burrito support arrived in
#     session 4 by pinning the staging branch
#     `appbuilder-agent-stg:feature-scripture-burrito` (D-009; closes H-001).
#     Open-007 tracks the promotion to a stable
#     `appbuilder-agent-prd:<tag>` once the upstream feature branch merges.
#
# Authority: canon/specs/appbuilder-mcp-v1-spec.md §5 (container shape).
# Provenance: structurally derived from ptxprint-mcp/Dockerfile pattern.
# History:
#   - canon/encodings/transcript-encoded-session-3.md (D-008 revising
#     session-1 D-002 — the FROM-choice error and its fix).
#   - canon/encodings/transcript-encoded-session-4.md (D-009 — pinning
#     stg:feature-scripture-burrito; D-010 — collapsing to a single
#     `APP_BUILDERS_IMAGE` ARG so the full image+tag is one substitution).

# Full image reference as a single ARG. Override at image-build time when
# moving to stg/prd or to a different feature branch — keeps the substitution
# point one place rather than two coupled ARGs (image + tag).
ARG APP_BUILDERS_IMAGE=ghcr.io/sillsdev/appbuilder-agent-stg:feature-scripture-burrito

FROM ${APP_BUILDERS_IMAGE}

LABEL maintainer="klappy" \
  org.opencontainers.image.source="https://github.com/klappy/appbuilder-mcp" \
  org.opencontainers.image.description="appbuilder-mcp container — wraps Scripture App Builder CLI behind a FastAPI HTTP handler"

# python3 + python3-pip are already installed in the agent image (ansible
# uses them). We add only our HTTP-handler runtime deps. --break-system-packages
# is a defensive flag in case the upstream Python ever moves to PEP 668
# enforcement; harmless on jammy where it's a no-op.
WORKDIR /app

COPY container/requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /app/requirements.txt

COPY container/main.py /app/main.py

# ---------- Bundled debug keystore (Phase-0 floor) ----------
#
# The Container ships with a debug keystore generated at image-build time
# so a payload of {name, package, bible_source} produces a runnable APK
# with no caller-side signing setup. Production builds MUST override.
#
# Authority: canon/articles/bundled-debug-keystore.md.
# `keytool` is already in the agent image (Java toolchain is part of the
# Android build path).
#
# debug.properties format: SAB consumes its `-i <file>` argument as an
# "additional parameters file" — flat lines of CLI flags, NOT Java
# key=value properties. Per the SIL "Building Apps" PDF §4.14 (page 37–38)
# and verified empirically against the priming script's keystore_prime.txt
# in sillsdev/docker-appbuilder-agent. Session 5 H-002 first smoke caught
# the prior key=value form as a silent no-op.
RUN mkdir -p /app-builders/debug-keystore \
 && keytool -genkey -v \
      -keystore /app-builders/debug-keystore/debug.keystore \
      -alias appbuilder-mcp-debug \
      -keyalg RSA -keysize 2048 \
      -validity 10000 \
      -storepass appbuilder-mcp-debug \
      -keypass appbuilder-mcp-debug \
      -dname "CN=appbuilder-mcp debug, OU=appbuilder-mcp, O=klappy, L=Unknown, ST=Unknown, C=US" \
 && printf -- '-ksp appbuilder-mcp-debug\n-ka appbuilder-mcp-debug\n-kap appbuilder-mcp-debug\n' \
      > /app-builders/debug-keystore/debug.properties \
 && chmod 644 /app-builders/debug-keystore/*

ENV APPBUILDER_DEBUG_KEYSTORE=/app-builders/debug-keystore/debug.keystore \
    APPBUILDER_DEBUG_KEYSTORE_INFO=/app-builders/debug-keystore/debug.properties \
    PYTHONUNBUFFERED=1

EXPOSE 8080

# Override phusion's /sbin/my_init with uvicorn directly. Single-process
# container; we don't need runit-style service supervision. If that ever
# becomes load-bearing (e.g. we want syslog), drop a runit script in
# /etc/service/uvicorn/run and restore CMD ["/sbin/my_init"].
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info", "--app-dir", "/app"]
