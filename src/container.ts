/**
 * AppbuilderContainer — Durable Object wrapper for the Cloudflare Container
 * that runs Scripture App Builder + the FastAPI HTTP handler.
 *
 * The base Container class (from @cloudflare/containers) handles the
 * lifecycle (cold start, sleep, restart) and HTTP proxying automatically.
 * Any fetch on the DO stub is forwarded to the running container at
 * `defaultPort`.
 *
 * Per canon/specs/appbuilder-mcp-v1-spec.md §5:
 *   instance_type: standard-3 (1/2 vCPU, 12 GiB, 20 GB)  // declared in wrangler.jsonc
 *   sleepAfter: 60m                                       // covers a full Android build + buffer
 *
 * The container's HTTP handler at POST /jobs runs scripture-app-builder
 * synchronously, uploads to R2, calls back to JobStateDO, and returns when
 * done.
 *
 * Provenance: copied from ptxprint-mcp/src/container.ts pattern; instance
 * sizing and sleepAfter window adjusted for the heavier Android toolchain.
 */

import { Container } from "@cloudflare/containers";

interface ContainerEnv {
  JOB_STATE: DurableObjectNamespace;
  OUTPUTS: R2Bucket;
}

export class AppbuilderContainer extends Container<ContainerEnv> {
  defaultPort = 8080;
  sleepAfter = "60m";

  // Pass env vars to the container at start.
  envVars = {
    PYTHONUNBUFFERED: "1",
  };
}
