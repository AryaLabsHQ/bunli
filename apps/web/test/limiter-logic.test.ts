import { describe, expect, test } from "bun:test";
import {
  DEFAULT_LIMITS,
  applyFinishRun,
  applyStartRun,
  cleanupExpiredInflight,
} from "../src/durable-objects/limiter-logic";

describe("workbench limiter logic", () => {
  test("allows a run, blocks concurrent run, then allows after finish", () => {
    const nowMs = 1_700_000_000_000;

    const first = applyStartRun({}, nowMs, DEFAULT_LIMITS, "run-1");
    expect(first.ok).toBe(true);
    expect(first.state.inflight?.runId).toBe("run-1");

    const second = applyStartRun(first.state, nowMs + 100, DEFAULT_LIMITS, "run-2");
    expect(second.ok).toBe(false);
    expect(second.code).toBe("RUN_IN_FLIGHT");

    const finished = applyFinishRun(first.state, nowMs + 200, "run-1");
    expect(finished.ok).toBe(true);
    expect(finished.state.inflight).toBeUndefined();

    const third = applyStartRun(finished.state, nowMs + 300, DEFAULT_LIMITS, "run-3");
    expect(third.ok).toBe(true);
    expect(third.state.inflight?.runId).toBe("run-3");
  });

  test("enforces hourly run limit", () => {
    const nowMs = 1_700_000_000_000;
    let state = {};

    for (let index = 0; index < DEFAULT_LIMITS.runHourLimit; index += 1) {
      const started = applyStartRun(state, nowMs + index, DEFAULT_LIMITS, `run-${index}`);
      expect(started.ok).toBe(true);

      const finished = applyFinishRun(started.state, nowMs + index + 1, `run-${index}`);
      expect(finished.ok).toBe(true);
      state = finished.state;
    }

    const denied = applyStartRun(state, nowMs + 5_000, DEFAULT_LIMITS, "run-over");
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe("RATE_LIMITED");
    expect(typeof denied.retryAfterMs).toBe("number");
    expect((denied.retryAfterMs ?? 0) > 0).toBe(true);
  });

  test("cleans up expired inflight runs", () => {
    const nowMs = 1_700_000_000_000;

    const state = {
      inflight: {
        runId: "run-old",
        startedAtMs: nowMs - 40_000,
        expiresAtMs: nowMs - 1,
      },
    };

    const cleaned = cleanupExpiredInflight(state, nowMs);
    expect(cleaned.inflight).toBeUndefined();
  });
});
