---
title: Use Non-Blocking Side Effects After Response
impact: MEDIUM
impactDescription: faster response times
tags: server, async, logging, analytics, side-effects, cloudflare, tanstack-start
---

## Use Non-Blocking Side Effects After Response

Schedule logging, analytics, and other side effects so they do not block the response. TanStack
Start has no `after()` API — defer at the **Worker boundary** with `ctx.waitUntil()`. A promise left
floating inside a server function is best-effort only.

**Incorrect (blocks response):**

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    await updateDatabase(request);

    const userAgent = request.headers.get("user-agent") || "unknown";
    await logUserAction({ userAgent });

    return Response.json({ status: "success" });
  },
};
```

**Correct (non-blocking on Cloudflare Workers):**

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    await updateDatabase(request);

    const userAgent = request.headers.get("user-agent") || "unknown";
    ctx.waitUntil(logUserAction({ userAgent }));

    return Response.json({ status: "success" });
  },
};
```

**Lossy (fire-and-forget inside createServerFn):**

Acceptable only for work you can afford to lose. On Cloudflare Workers the runtime may cancel a
floating promise once the response is sent, so the analytics call below can be dropped:

```typescript
import { createServerFn } from "@tanstack/react-start";

export const submitForm = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const result = await saveForm(data);

  void trackAnalytics({ formId: data.id }).catch(console.error);

  return result;
});
```

**Not equivalent to `waitUntil`:** `void` starts the work before the RPC response is sent but does
not keep it alive afterwards. For work that must complete (audit logs, webhooks), pass the promise
to `ctx.waitUntil()` from the Worker handler, or send it to a queue.

**Common use cases:**

- Analytics tracking
- Audit logging
- Sending notifications
- Cache invalidation
- Cleanup tasks

**Important:** Only defer work that is safe to run after the client receives a response. Mutations
the client depends on must complete before returning.
