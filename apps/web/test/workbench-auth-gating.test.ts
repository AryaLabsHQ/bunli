import { describe, expect, test } from "bun:test";
import { AuthRequiredError, type AuthSession } from "../src/api/auth/session";
import { createWorkbenchRouter, type WorkbenchDeps } from "../src/api/workbench/router";

function createDeps(overrides: Partial<WorkbenchDeps> = {}): WorkbenchDeps {
  return {
    requireSession: async () => {
      return {
        user: { id: "user-1", email: "user@example.com", name: "User" },
        session: { id: "session-1" },
      } satisfies AuthSession;
    },
    allowSessionCreate: async () => ({ ok: true }),
    startRun: async () => ({ ok: true }),
    finishRun: async () => ({ ok: true }),
    allowPtyConnect: async () => ({ ok: true }),
    getOrCreateWorkbenchSession: async () => {
      throw new Error("not expected in this test");
    },
    now: () => 1_700_000_000_000,
    ...overrides,
  };
}

describe("workbench API auth + gating", () => {
  test("returns AUTH_REQUIRED when unauthenticated", async () => {
    const deps = createDeps({
      requireSession: async () => {
        throw new AuthRequiredError();
      },
    });

    const app = createWorkbenchRouter(deps);
    const response = await app.request("/session", { method: "POST" });
    const payload = (await response.json()) as { ok: boolean; code: string; message: string };

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("returns RATE_LIMITED from run gate when limiter denies", async () => {
    const deps = createDeps({
      startRun: async () => ({ ok: false, code: "RATE_LIMITED", retryAfterMs: 3000 }),
    });

    const app = createWorkbenchRouter(deps);
    const response = await app.request("/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ preset: "framework" }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      retryAfterMs?: number;
    };

    expect(response.status).toBe(429);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("RATE_LIMITED");
    expect(payload.retryAfterMs).toBe(3000);
  });
});
