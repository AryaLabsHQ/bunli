---
title: Prevent Waterfall Chains in Loaders and Server Functions
impact: CRITICAL
impactDescription: 2-10× improvement
tags: loaders, server-functions, waterfalls, parallelization, tanstack-start
---

## Prevent Waterfall Chains in Loaders and Server Functions

In route `beforeLoad`, `loader`, and `createServerFn` handlers, start independent operations
immediately — assign promises before `await`ing them.

**`beforeLoad` is isomorphic:** runs on server for the initial document request and on the client
for navigations (unless `ssr: false`). Put server-only I/O in `createServerFn`, not bare DB/env
imports at module scope.

**Incorrect (config waits for auth, data waits for both):**

```typescript
export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const session = await getSession();
    const config = await fetchConfig();
    const data = await fetchData(session.userId);
    return { session, config, data };
  },
});
```

**Correct (auth and config start immediately):**

```typescript
export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const sessionPromise = getSession();
    const configPromise = fetchConfig();
    const session = await sessionPromise;
    const [config, data] = await Promise.all([configPromise, fetchData(session.userId)]);
    return { session, config, data };
  },
});
```

**Inside createServerFn:**

```typescript
export const getDashboardBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const orgPromise = fetchOrg();
  const flagsPromise = fetchFeatureFlags();
  const [org, flags] = await Promise.all([orgPromise, flagsPromise]);
  return { org, flags };
});
```

For operations with partial dependencies, use `better-all` to maximize parallelism (see
Dependency-Based Parallelization).
