import type { RunPreset } from "./constants";

export type WorkbenchMode = "real" | "scripted";

export interface WorkbenchErrorResponse {
  ok: false;
  code:
    | "AUTH_REQUIRED"
    | "RATE_LIMITED"
    | "INVALID_SESSION"
    | "SANDBOX_NOT_READY"
    | "SANDBOX_FAILED"
    | "METHOD_NOT_ALLOWED"
    | "BAD_REQUEST"
    | "NOT_FOUND"
    | "INTERNAL_ERROR";
  message: string;
  retryAfterMs?: number;
}

export interface WorkbenchSessionResponse {
  ok: true;
  mode: WorkbenchMode;
  sandboxId: string;
  sessionId: string;
}

export interface WorkbenchFileSyncResponse {
  ok: true;
  path: string;
  bytes: number;
}

export interface WorkbenchRunResponse {
  ok: true;
  runId: string;
  sessionId: string;
  preset: RunPreset;
  command: string;
  timeoutMs: number;
}

export interface WorkbenchRunFinishResponse {
  ok: true;
  runId: string;
}

export interface WorkbenchPtyDisconnectResponse {
  ok: true;
  sessionId: string;
}
