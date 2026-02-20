import type { AuthSession } from "../auth/session";

export interface WorkbenchIdentity {
  userId: string;
  sandboxId: string;
  sessionId: string;
}

function normalizeId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

export function deriveWorkbenchIds(session: AuthSession) {
  const stable = normalizeId(session.user.id) || "anonymous";
  const result: WorkbenchIdentity = {
    userId: session.user.id,
    sandboxId: `bunli-${stable}`,
    sessionId: `sess-${stable}`,
  };
  return result;
}
