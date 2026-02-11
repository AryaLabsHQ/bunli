import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { AuthRequiredError, requireSession, type AuthSession } from "../auth/session";
import {
  PRESET_COMMANDS,
  WORKBENCH_FILE_PATH,
  WORKBENCH_RUN_TIMEOUT_MS,
  WORKBENCH_SESSION_TTL_SECONDS,
} from "./constants";
import { workbenchError } from "./errors";
import { deriveWorkbenchIds } from "./identity";
import {
  allowPtyConnect,
  allowSessionCreate,
  finishRun,
  startRun,
  type LimiterResponse,
} from "./limiter";
import { logWorkbenchEvent } from "./logging";
import {
  type WorkbenchSessionResult,
} from "./sandbox";
import type {
  WorkbenchFileSyncResponse,
  WorkbenchPtyDisconnectResponse,
  WorkbenchRunFinishResponse,
  WorkbenchRunResponse,
  WorkbenchSessionResponse,
} from "./types";

interface WorkbenchVariables {
  authSession: AuthSession;
}

type WorkbenchEnv = {
  Bindings: Env;
  Variables: WorkbenchVariables;
};

export interface WorkbenchDeps {
  requireSession: (request: Request, env: Env) => Promise<AuthSession>;
  allowSessionCreate: (env: Env, userId: string) => Promise<LimiterResponse>;
  startRun: (env: Env, userId: string, runId: string) => Promise<LimiterResponse>;
  finishRun: (env: Env, userId: string, runId: string) => Promise<LimiterResponse>;
  allowPtyConnect: (env: Env, userId: string) => Promise<LimiterResponse>;
  getOrCreateWorkbenchSession: (
    env: Env,
    ids: ReturnType<typeof deriveWorkbenchIds>,
    options?: {
      onBeforeCreate?: () => Promise<LimiterResponse>;
    }
  ) => Promise<WorkbenchSessionResult>;
  now: () => number;
}

const defaultDeps: WorkbenchDeps = {
  requireSession,
  allowSessionCreate,
  startRun,
  finishRun,
  allowPtyConnect,
  getOrCreateWorkbenchSession: async (env, ids, options) => {
    const sandbox = await import("./sandbox");
    return sandbox.getOrCreateWorkbenchSession(env, ids, options);
  },
  now: () => Date.now(),
};

const fileSyncSchema = z.object({
  content: z.string().min(1).max(120_000),
});

const runSchema = z.object({
  preset: z.enum(["framework", "toolchain"]),
});

const finishRunSchema = z.object({
  runId: z.string().min(1).max(200),
});

const ptyDisconnectSchema = z.object({
  sessionId: z.string().min(1).max(200),
});

function parseDimension(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function isRateLimitedError(
  error: unknown
): error is {
  code: "RATE_LIMITED";
  message: string;
  retryAfterMs?: number;
} {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    retryAfterMs?: unknown;
  };

  return (
    candidate.code === "RATE_LIMITED" &&
    typeof candidate.message === "string" &&
    (candidate.retryAfterMs === undefined || typeof candidate.retryAfterMs === "number")
  );
}

export function createWorkbenchRouter(deps: WorkbenchDeps = defaultDeps) {
  const app = new Hono<WorkbenchEnv>();

  app.use("*", async (c, next) => {
    try {
      const session = await deps.requireSession(c.req.raw, c.env);
      c.set("authSession", session);
      await next();
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        return c.json(workbenchError("AUTH_REQUIRED", "Authentication required"), 401);
      }

      throw error;
    }
  });

  app.post("/session", async (c) => {
    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const { created } = await deps.getOrCreateWorkbenchSession(c.env, ids, {
      onBeforeCreate: () => deps.allowSessionCreate(c.env, ids.userId),
    });

    logWorkbenchEvent("session_start", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
      created,
      ttlSeconds: WORKBENCH_SESSION_TTL_SECONDS,
    });

    const response: WorkbenchSessionResponse = {
      ok: true,
      mode: "real",
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
    };

    return c.json(response);
  });

  app.put("/files/src/index.ts", zValidator("json", fileSyncSchema), async (c) => {
    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const { content } = c.req.valid("json");

    const { session } = await deps.getOrCreateWorkbenchSession(c.env, ids, {
      onBeforeCreate: () => deps.allowSessionCreate(c.env, ids.userId),
    });

    await session.writeFile(WORKBENCH_FILE_PATH, content);

    logWorkbenchEvent("file_sync", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
      path: WORKBENCH_FILE_PATH,
      bytes: new TextEncoder().encode(content).byteLength,
    });

    const response: WorkbenchFileSyncResponse = {
      ok: true,
      path: WORKBENCH_FILE_PATH,
      bytes: new TextEncoder().encode(content).byteLength,
    };

    return c.json(response);
  });

  app.post("/run", zValidator("json", runSchema), async (c) => {
    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const { preset } = c.req.valid("json");
    const runId = `run-${deps.now()}-${crypto.randomUUID()}`;

    const runAllowance = await deps.startRun(c.env, ids.userId, runId);
    if (!runAllowance.ok) {
      return c.json(
        workbenchError("RATE_LIMITED", "Run limit exceeded", {
          retryAfterMs: runAllowance.retryAfterMs,
        }),
        429
      );
    }

    try {
      await deps.getOrCreateWorkbenchSession(c.env, ids, {
        onBeforeCreate: () => deps.allowSessionCreate(c.env, ids.userId),
      });
    } catch (error) {
      await deps.finishRun(c.env, ids.userId, runId);
      throw error;
    }

    logWorkbenchEvent("run_start", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
      runId,
      preset,
      timeoutMs: WORKBENCH_RUN_TIMEOUT_MS,
    });

    const response: WorkbenchRunResponse = {
      ok: true,
      runId,
      sessionId: ids.sessionId,
      preset,
      command: PRESET_COMMANDS[preset],
      timeoutMs: WORKBENCH_RUN_TIMEOUT_MS,
    };

    return c.json(response);
  });

  app.post("/run/finish", zValidator("json", finishRunSchema), async (c) => {
    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const { runId } = c.req.valid("json");

    await deps.finishRun(c.env, ids.userId, runId);

    logWorkbenchEvent("run_end", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
      runId,
    });

    const response: WorkbenchRunFinishResponse = {
      ok: true,
      runId,
    };

    return c.json(response);
  });

  app.get("/pty", async (c) => {
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
      return c.json(
        workbenchError("METHOD_NOT_ALLOWED", "WebSocket upgrade is required"),
        426
      );
    }

    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const requestedSessionId = c.req.query("sessionId");

    if (!requestedSessionId) {
      return c.json(workbenchError("BAD_REQUEST", "sessionId query parameter is required"), 400);
    }

    if (requestedSessionId !== ids.sessionId) {
      return c.json(workbenchError("INVALID_SESSION", "Invalid sessionId for user"), 403);
    }

    const ptyAllowance = await deps.allowPtyConnect(c.env, ids.userId);
    if (!ptyAllowance.ok) {
      return c.json(
        workbenchError("RATE_LIMITED", "PTY connection limit exceeded", {
          retryAfterMs: ptyAllowance.retryAfterMs,
        }),
        429
      );
    }

    const cols = parseDimension(c.req.query("cols"));
    const rows = parseDimension(c.req.query("rows"));

    const { session } = await deps.getOrCreateWorkbenchSession(c.env, ids, {
      onBeforeCreate: () => deps.allowSessionCreate(c.env, ids.userId),
    });

    logWorkbenchEvent("pty_connect", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId: ids.sessionId,
      cols,
      rows,
    });

    const response = await session.terminal(c.req.raw, { cols, rows });
    if (response.status >= 400) {
      logWorkbenchEvent("pty_connect_failed", {
        userId: ids.userId,
        sandboxId: ids.sandboxId,
        sessionId: ids.sessionId,
        status: response.status,
      });
    }

    return response;
  });

  app.post("/pty/disconnect", zValidator("json", ptyDisconnectSchema), async (c) => {
    const authSession = c.get("authSession");
    const ids = deriveWorkbenchIds(authSession);
    const { sessionId } = c.req.valid("json");

    if (sessionId !== ids.sessionId) {
      return c.json(workbenchError("INVALID_SESSION", "Invalid sessionId for user"), 403);
    }

    logWorkbenchEvent("pty_disconnect", {
      userId: ids.userId,
      sandboxId: ids.sandboxId,
      sessionId,
    });

    const response: WorkbenchPtyDisconnectResponse = {
      ok: true,
      sessionId,
    };

    return c.json(response);
  });

  app.onError((error, c) => {
    if (isRateLimitedError(error)) {
      return c.json(
        workbenchError("RATE_LIMITED", error.message, {
          retryAfterMs: error.retryAfterMs,
        }),
        429
      );
    }

    console.error("Unhandled workbench API error", error);
    return c.json(
      workbenchError("SANDBOX_FAILED", "Workbench backend failed to process the request"),
      500
    );
  });

  return app;
}
