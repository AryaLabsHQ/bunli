import type { Sandbox } from "./durable-objects/sandbox";
import type { WorkbenchLimiter } from "./durable-objects/workbench-limiter";

declare global {
  interface Env {
    Sandbox: DurableObjectNamespace<Sandbox>;
    WORKBENCH_LIMITER: DurableObjectNamespace<WorkbenchLimiter>;
    CF_VERSION_METADATA?: { id: string };

    SITE_URL: string;
    BETTER_AUTH_BASE_URL: string;
    BETTER_AUTH_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;

    WORKBENCH_WORKSPACE_DIR: string;
    WORKBENCH_BUN_VERSION: string;
    WORKBENCH_BUNLI_VERSION: string;
    WORKBENCH_SANDBOX_NETWORK: string;
  }
}

export {};
