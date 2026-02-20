import type { WorkbenchErrorResponse } from "./types";

export function workbenchError(
  code: WorkbenchErrorResponse["code"],
  message: string,
  options: { retryAfterMs?: number } = {}
): WorkbenchErrorResponse {
  return {
    ok: false,
    code,
    message,
    ...(typeof options.retryAfterMs === "number" ? { retryAfterMs: options.retryAfterMs } : {}),
  };
}
