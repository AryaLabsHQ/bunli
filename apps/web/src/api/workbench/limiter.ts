export interface LimiterResponse {
  ok: boolean;
  code?: string;
  retryAfterMs?: number;
  runId?: string;
}

async function postLimiter(
  env: Env,
  userId: string,
  actionPath: string,
  body: Record<string, unknown> = {}
): Promise<LimiterResponse> {
  const id = env.WORKBENCH_LIMITER.idFromName(userId);
  const stub = env.WORKBENCH_LIMITER.get(id);
  const response = await stub.fetch(`https://workbench-limiter${actionPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as LimiterResponse;
}

export function allowSessionCreate(env: Env, userId: string) {
  return postLimiter(env, userId, "/session/create");
}

export function startRun(env: Env, userId: string, runId: string) {
  return postLimiter(env, userId, "/run/start", { runId });
}

export function finishRun(env: Env, userId: string, runId: string) {
  return postLimiter(env, userId, "/run/finish", { runId });
}

export function allowPtyConnect(env: Env, userId: string) {
  return postLimiter(env, userId, "/pty/connect");
}
