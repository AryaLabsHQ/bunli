import {
  DEFAULT_LIMITS,
  applyFinishRun,
  applyPtyConnect,
  applySessionCreate,
  applyStartRun,
  cleanupExpiredInflight,
  type LimiterState,
} from "./limiter-logic";
import { DurableObject } from "cloudflare:workers";

const STATE_KEY = "limiter:state";

interface LimiterActionPayload {
  runId?: string;
  nowMs?: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export class WorkbenchLimiter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async loadState(): Promise<LimiterState> {
    return (await this.ctx.storage.get<LimiterState>(STATE_KEY)) ?? {};
  }

  private async saveState(state: LimiterState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);

    if (state.inflight) {
      await this.ctx.storage.setAlarm(state.inflight.expiresAtMs);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nowMs = Date.now();

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      const state = await this.loadState();
      return json(state);
    }

    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    let payload: LimiterActionPayload = {};
    try {
      payload = (await request.json()) as LimiterActionPayload;
    } catch {
      payload = {};
    }

    const actionNowMs = payload.nowMs ?? nowMs;
    const path = url.pathname;

    const result = await this.ctx.blockConcurrencyWhile(async () => {
      const state = await this.loadState();

      if (path.endsWith("/run/start")) {
        const runId = payload.runId ?? `run-${actionNowMs}-${crypto.randomUUID()}`;
        const decision = applyStartRun(state, actionNowMs, DEFAULT_LIMITS, runId);
        await this.saveState(decision.state);
        return decision;
      }

      if (path.endsWith("/run/finish")) {
        const decision = applyFinishRun(state, actionNowMs, payload.runId);
        await this.saveState(decision.state);
        return decision;
      }

      if (path.endsWith("/pty/connect")) {
        const decision = applyPtyConnect(state, actionNowMs, DEFAULT_LIMITS);
        await this.saveState(decision.state);
        return decision;
      }

      if (path.endsWith("/session/create")) {
        const decision = applySessionCreate(state, actionNowMs, DEFAULT_LIMITS);
        await this.saveState(decision.state);
        return decision;
      }

      return { ok: false, code: "NOT_FOUND" as const, state };
    });

    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 429;
      return json(result, status);
    }

    return json(result);
  }

  async alarm(): Promise<void> {
    const nowMs = Date.now();
    const state = await this.loadState();
    const next = cleanupExpiredInflight(state, nowMs);
    await this.saveState(next);
  }
}
