import {
  getSandbox,
  type ExecutionSession,
  type Sandbox as CloudflareSandbox,
} from "@cloudflare/sandbox";
import {
  DEFAULT_SOURCE_FILE,
  WORKBENCH_FILE_PATH,
  WORKBENCH_SLEEP_AFTER,
  WORKBENCH_SRC_DIR,
  WORKBENCH_WORKSPACE,
} from "./constants";
import type { WorkbenchIdentity } from "./identity";
import type { LimiterResponse } from "./limiter";

export interface WorkbenchSessionResult {
  sandbox: CloudflareSandbox;
  session: ExecutionSession;
  created: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown sandbox error";
}

export class WorkbenchRateLimitError extends Error {
  readonly code = "RATE_LIMITED" as const;
  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "WorkbenchRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function getWorkbenchSandbox(env: Env, sandboxId: string): CloudflareSandbox {
  return getSandbox(env.Sandbox, sandboxId, {
    normalizeId: true,
    sleepAfter: WORKBENCH_SLEEP_AFTER,
  });
}

async function ensureWorkspace(session: ExecutionSession): Promise<void> {
  await session.mkdir(WORKBENCH_WORKSPACE, { recursive: true });
  await session.mkdir(WORKBENCH_SRC_DIR, { recursive: true });

  const fileState = await session.exists(WORKBENCH_FILE_PATH);
  if (!fileState.exists) {
    await session.writeFile(WORKBENCH_FILE_PATH, DEFAULT_SOURCE_FILE);
  }
}

async function resolveSession(
  sandbox: CloudflareSandbox,
  sessionId: string
): Promise<ExecutionSession | null> {
  try {
    return await sandbox.getSession(sessionId);
  } catch {
    return null;
  }
}

export async function getOrCreateWorkbenchSession(
  env: Env,
  ids: WorkbenchIdentity,
  options: {
    onBeforeCreate?: () => Promise<LimiterResponse>;
  } = {}
): Promise<WorkbenchSessionResult> {
  const sandbox = getWorkbenchSandbox(env, ids.sandboxId);

  const existingSession = await resolveSession(sandbox, ids.sessionId);
  if (existingSession) {
    await ensureWorkspace(existingSession);
    return {
      sandbox,
      session: existingSession,
      created: false,
    };
  }

  if (options.onBeforeCreate) {
    const allowed = await options.onBeforeCreate();
    if (!allowed.ok) {
      throw new WorkbenchRateLimitError(
        "Session creation rate limit exceeded",
        allowed.retryAfterMs
      );
    }
  }

  const preferredOptions = {
    id: ids.sessionId,
    cwd: WORKBENCH_WORKSPACE,
    env: {
      WORKBENCH_BUN_VERSION: env.WORKBENCH_BUN_VERSION,
      WORKBENCH_BUNLI_VERSION: env.WORKBENCH_BUNLI_VERSION,
      WORKBENCH_SANDBOX_NETWORK: env.WORKBENCH_SANDBOX_NETWORK,
    },
  };

  try {
    let createdSession: ExecutionSession;
    try {
      createdSession = await sandbox.createSession(preferredOptions);
    } catch (preferredError) {
      console.warn(
        "workbench session create (preferred options) failed; retrying minimal options",
        {
          sandboxId: ids.sandboxId,
          sessionId: ids.sessionId,
          error: getErrorMessage(preferredError),
        }
      );

      createdSession = await sandbox.createSession({
        id: ids.sessionId,
      });
    }

    await ensureWorkspace(createdSession);
    return {
      sandbox,
      session: createdSession,
      created: true,
    };
  } catch (error) {
    const recoveredSession = await resolveSession(sandbox, ids.sessionId);
    if (!recoveredSession) {
      throw new Error(`Sandbox session unavailable: ${getErrorMessage(error)}`);
    }

    await ensureWorkspace(recoveredSession);
    return {
      sandbox,
      session: recoveredSession,
      created: false,
    };
  }
}
