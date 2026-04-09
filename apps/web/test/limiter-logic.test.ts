import { describe, expect, test } from "bun:test";

import {
  DEFAULT_LIMITS,
  applyAbortRun,
  applyFinishRun,
  applyPtyConnect,
  applyRollbackRun,
  applyRollbackSessionCreate,
  applyStartRun,
  applySessionCreate,
  cleanupExpiredInflight,
} from "../src/durable-objects/limiter-logic";

describe("workbench limiter logic", () => {
  test("allows a run, blocks concurrent run, then allows after finish", () => {
    const nowMs = 1_700_000_000_000;
    const completionToken = "token-1";

    const first = applyStartRun({}, nowMs, DEFAULT_LIMITS, "run-1", completionToken);
    expect(first.ok).toBe(true);
    expect(first.state.inflight?.runId).toBe("run-1");

    const second = applyStartRun(first.state, nowMs + 100, DEFAULT_LIMITS, "run-2", "token-2");
    expect(second.ok).toBe(false);
    expect(second.code).toBe("RUN_IN_FLIGHT");

    const finished = applyFinishRun(first.state, nowMs + 200, "run-1", completionToken);
    expect(finished.ok).toBe(true);
    expect(finished.released).toBe(true);
    expect(finished.state.inflight).toBeUndefined();

    const third = applyStartRun(finished.state, nowMs + 300, DEFAULT_LIMITS, "run-3", "token-3");
    expect(third.ok).toBe(true);
    expect(third.state.inflight?.runId).toBe("run-3");
  });

  test("enforces hourly run limit", () => {
    const nowMs = 1_700_000_000_000;
    let state = {};

    for (let index = 0; index < DEFAULT_LIMITS.runHourLimit; index += 1) {
      const started = applyStartRun(
        state,
        nowMs + index,
        DEFAULT_LIMITS,
        `run-${index}`,
        `token-${index}`,
      );
      expect(started.ok).toBe(true);

      const finished = applyFinishRun(
        started.state,
        nowMs + index + 1,
        `run-${index}`,
        `token-${index}`,
      );
      expect(finished.ok).toBe(true);
      state = finished.state;
    }

    const denied = applyStartRun(state, nowMs + 5_000, DEFAULT_LIMITS, "run-over", "token-over");
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe("RATE_LIMITED");
    expect(typeof denied.retryAfterMs).toBe("number");
    expect((denied.retryAfterMs ?? 0) > 0).toBe(true);
  });

  test("does not release inflight run without the matching completion token", () => {
    const nowMs = 1_700_000_000_000;
    const started = applyStartRun({}, nowMs, DEFAULT_LIMITS, "run-1", "token-1");
    expect(started.ok).toBe(true);

    const mismatched = applyFinishRun(started.state, nowMs + 100, "run-1", "wrong-token");
    expect(mismatched.ok).toBe(true);
    expect(mismatched.released).toBe(false);
    expect(mismatched.state.inflight?.runId).toBe("run-1");

    const aborted = applyAbortRun(started.state, nowMs + 200, "run-1");
    expect(aborted.ok).toBe(true);
    expect(aborted.released).toBe(true);
    expect(aborted.state.inflight).toBeUndefined();
  });

  test("daily limit denial does not consume the hourly counter", () => {
    const nowMs = 1_700_000_000_000;
    const started = applyStartRun(
      {
        runDay: {
          windowStartMs: nowMs - (nowMs % (24 * 60 * 60 * 1000)),
          count: DEFAULT_LIMITS.runDayLimit,
        },
      },
      nowMs,
      DEFAULT_LIMITS,
      "run-1",
      "token-1",
    );

    expect(started.ok).toBe(false);
    expect(started.state.runHour?.count ?? 0).toBe(0);
  });

  test("rollback run and session creation restore consumed counters", () => {
    const nowMs = 1_700_000_000_000;

    const sessionCreated = applySessionCreate({}, nowMs, DEFAULT_LIMITS);
    expect(sessionCreated.ok).toBe(true);
    expect(sessionCreated.state.sessionDay?.count).toBe(1);

    const rolledBackSession = applyRollbackSessionCreate(sessionCreated.state, nowMs + 10);
    expect(rolledBackSession.ok).toBe(true);
    expect(rolledBackSession.released).toBe(true);
    expect(rolledBackSession.state.sessionDay?.count).toBe(0);

    const runStarted = applyStartRun({}, nowMs, DEFAULT_LIMITS, "run-1", "token-1");
    expect(runStarted.ok).toBe(true);
    expect(runStarted.state.runHour?.count).toBe(1);
    expect(runStarted.state.runDay?.count).toBe(1);

    const rolledBackRun = applyRollbackRun(runStarted.state, nowMs + 10, "run-1");
    expect(rolledBackRun.ok).toBe(true);
    expect(rolledBackRun.released).toBe(true);
    expect(rolledBackRun.state.inflight).toBeUndefined();
    expect(rolledBackRun.state.runHour?.count).toBe(0);
    expect(rolledBackRun.state.runDay?.count).toBe(0);
  });

  test("requires an active run before opening a PTY", () => {
    const nowMs = 1_700_000_000_000;

    const denied = applyPtyConnect({}, nowMs, DEFAULT_LIMITS);
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe("RUN_NOT_STARTED");

    const started = applyStartRun({}, nowMs + 1, DEFAULT_LIMITS, "run-1", "token-1");
    expect(started.ok).toBe(true);

    const allowed = applyPtyConnect(started.state, nowMs + 2, DEFAULT_LIMITS);
    expect(allowed.ok).toBe(true);
    expect(allowed.state.ptyMinute?.count).toBe(1);
  });

  test("cleans up expired inflight runs", () => {
    const nowMs = 1_700_000_000_000;

    const state = {
      inflight: {
        runId: "run-old",
        completionToken: "token-old",
        startedAtMs: nowMs - 40_000,
        expiresAtMs: nowMs - 1,
      },
    };

    const cleaned = cleanupExpiredInflight(state, nowMs);
    expect(cleaned.inflight).toBeUndefined();
  });
});
