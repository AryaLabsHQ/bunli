export interface WindowCounter {
  windowStartMs: number;
  count: number;
}

export interface InflightRun {
  runId: string;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface LimiterState {
  runHour?: WindowCounter;
  runDay?: WindowCounter;
  ptyMinute?: WindowCounter;
  sessionDay?: WindowCounter;
  inflight?: InflightRun;
}

export interface LimiterLimits {
  runHourLimit: number;
  runDayLimit: number;
  ptyMinuteLimit: number;
  sessionDayLimit: number;
  inflightTtlMs: number;
}

export const DEFAULT_LIMITS: LimiterLimits = {
  runHourLimit: 20,
  runDayLimit: 100,
  ptyMinuteLimit: 2,
  sessionDayLimit: 5,
  inflightTtlMs: 120_000,
};

export interface LimiterDecision {
  ok: boolean;
  code?: "RATE_LIMITED" | "RUN_IN_FLIGHT";
  retryAfterMs?: number;
  runId?: string;
  state: LimiterState;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;

export function getWindowStartMs(nowMs: number, windowMs: number): number {
  return nowMs - (nowMs % windowMs);
}

function refreshCounter(counter: WindowCounter | undefined, nowMs: number, windowMs: number): WindowCounter {
  const start = getWindowStartMs(nowMs, windowMs);
  if (!counter || counter.windowStartMs !== start) {
    return { windowStartMs: start, count: 0 };
  }
  return counter;
}

function tryConsume(
  counter: WindowCounter | undefined,
  nowMs: number,
  windowMs: number,
  limit: number
): { counter: WindowCounter; ok: boolean; retryAfterMs?: number } {
  const refreshed = refreshCounter(counter, nowMs, windowMs);
  if (refreshed.count >= limit) {
    return {
      counter: refreshed,
      ok: false,
      retryAfterMs: refreshed.windowStartMs + windowMs - nowMs,
    };
  }

  return {
    counter: { ...refreshed, count: refreshed.count + 1 },
    ok: true,
  };
}

export function cleanupExpiredInflight(state: LimiterState, nowMs: number): LimiterState {
  if (!state.inflight || state.inflight.expiresAtMs > nowMs) {
    return state;
  }

  return {
    ...state,
    inflight: undefined,
  };
}

export function applyStartRun(
  state: LimiterState,
  nowMs: number,
  limits: LimiterLimits,
  runId: string
): LimiterDecision {
  const cleaned = cleanupExpiredInflight(state, nowMs);

  if (cleaned.inflight) {
    return {
      ok: false,
      code: "RUN_IN_FLIGHT",
      retryAfterMs: Math.max(0, cleaned.inflight.expiresAtMs - nowMs),
      state: cleaned,
    };
  }

  const runHour = tryConsume(cleaned.runHour, nowMs, HOUR_MS, limits.runHourLimit);
  if (!runHour.ok) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterMs: runHour.retryAfterMs,
      state: {
        ...cleaned,
        runHour: runHour.counter,
      },
    };
  }

  const runDay = tryConsume(cleaned.runDay, nowMs, DAY_MS, limits.runDayLimit);
  if (!runDay.ok) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterMs: runDay.retryAfterMs,
      state: {
        ...cleaned,
        runHour: runHour.counter,
        runDay: runDay.counter,
      },
    };
  }

  return {
    ok: true,
    runId,
    state: {
      ...cleaned,
      runHour: runHour.counter,
      runDay: runDay.counter,
      inflight: {
        runId,
        startedAtMs: nowMs,
        expiresAtMs: nowMs + limits.inflightTtlMs,
      },
    },
  };
}

export function applyFinishRun(
  state: LimiterState,
  nowMs: number,
  runId?: string
): LimiterDecision {
  const cleaned = cleanupExpiredInflight(state, nowMs);
  const active = cleaned.inflight;

  if (!active) {
    return {
      ok: true,
      state: cleaned,
    };
  }

  if (runId && active.runId !== runId) {
    return {
      ok: true,
      state: cleaned,
    };
  }

  return {
    ok: true,
    state: {
      ...cleaned,
      inflight: undefined,
    },
  };
}

export function applyPtyConnect(
  state: LimiterState,
  nowMs: number,
  limits: LimiterLimits
): LimiterDecision {
  const cleaned = cleanupExpiredInflight(state, nowMs);
  const pty = tryConsume(cleaned.ptyMinute, nowMs, MINUTE_MS, limits.ptyMinuteLimit);

  if (!pty.ok) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterMs: pty.retryAfterMs,
      state: {
        ...cleaned,
        ptyMinute: pty.counter,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...cleaned,
      ptyMinute: pty.counter,
    },
  };
}

export function applySessionCreate(
  state: LimiterState,
  nowMs: number,
  limits: LimiterLimits
): LimiterDecision {
  const cleaned = cleanupExpiredInflight(state, nowMs);
  const session = tryConsume(cleaned.sessionDay, nowMs, DAY_MS, limits.sessionDayLimit);

  if (!session.ok) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterMs: session.retryAfterMs,
      state: {
        ...cleaned,
        sessionDay: session.counter,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...cleaned,
      sessionDay: session.counter,
    },
  };
}
