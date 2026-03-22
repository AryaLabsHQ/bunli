import {
  getSandbox,
  type ExecutionSession,
  type Sandbox as CloudflareSandbox,
} from "@cloudflare/sandbox";
import {
  DEFAULT_SOURCE_FILE,
  getWorkbenchFilePath,
  getWorkbenchSrcDir,
  workbenchConfig,
} from "./constants";
import type { WorkbenchIdentity } from "./identity";
import type { LimiterResponse } from "./limiter";

export interface WorkbenchSessionResult {
  sandbox: CloudflareSandbox;
  session: ExecutionSession;
  created: boolean;
}

interface WorkbenchSessionOptions {
  onBeforeCreate?: () => Promise<LimiterResponse>;
  onCreateFailed?: () => Promise<void>;
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
    sleepAfter: workbenchConfig.sleepAfter,
  });
}

async function ensureSessionWorkspace(
  session: ExecutionSession
): Promise<void> {
  const srcDir = getWorkbenchSrcDir();
  const filePath = getWorkbenchFilePath();

  await session.mkdir(workbenchConfig.workspace, { recursive: true });
  await session.mkdir(srcDir, { recursive: true });

  const fileState = await session.exists(filePath);
  if (!fileState.exists) {
    await session.writeFile(filePath, DEFAULT_SOURCE_FILE);
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

export async function deleteWorkbenchSession(
  env: Env,
  ids: WorkbenchIdentity
): Promise<boolean> {
  const sandbox = getWorkbenchSandbox(env, ids.sandboxId);
  const existingSession = await resolveSession(sandbox, ids.sessionId);
  if (!existingSession) {
    return false;
  }

  await sandbox.deleteSession(ids.sessionId);
  return true;
}

export async function getOrCreateWorkbenchSession(
  env: Env,
  ids: WorkbenchIdentity,
  options: WorkbenchSessionOptions = {}
): Promise<WorkbenchSessionResult> {
  const sandbox = getWorkbenchSandbox(env, ids.sandboxId);

  const existingSession = await resolveSession(sandbox, ids.sessionId);
  if (existingSession) {
    await ensureSessionWorkspace(existingSession);
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
    cwd: workbenchConfig.workspace,
    env: {
      WORKBENCH_BUN_VERSION: workbenchConfig.bunVersion,
      WORKBENCH_BUNLI_VERSION: workbenchConfig.bunliVersion,
      WORKBENCH_SANDBOX_NETWORK: workbenchConfig.sandboxNetwork,
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

    await ensureSessionWorkspace(createdSession);
    return {
      sandbox,
      session: createdSession,
      created: true,
    };
  } catch (error) {
    const recoveredSession = await resolveSession(sandbox, ids.sessionId);
    if (!recoveredSession) {
      if (options.onCreateFailed) {
        await options.onCreateFailed();
      }
      throw new Error(`Sandbox session unavailable: ${getErrorMessage(error)}`);
    }

    await ensureSessionWorkspace(recoveredSession);
    return {
      sandbox,
      session: recoveredSession,
      created: false,
    };
  }
}
