---
title: Use React.cache Only During RSC Rendering
impact: MEDIUM
impactDescription: deduplicates work in an RSC render
tags: server, cache, react-cache, rsc, deduplication, tanstack-start
---

## Use React.cache Only During RSC Rendering

Use `cache()` only when React is executing a **React Server Component** render. Rendering a normal
React tree on the server does not make it RSC execution. TanStack Start loaders, request middleware,
server routes, and `createServerFn` handlers are ordinary server code. Only code executing inside an
explicit RSC render, such as a component rendered by `renderServerComponent`, qualifies; handler
code wrapping that render does not.

Outside an RSC render dispatcher, the function returned by `cache()` still runs, but it does not
read or populate a React cache. Do not use it as generic request-local storage or wrap
`createServerFn` internals and assume they deduplicate.

### Checking whether your build even has the caching implementation

Memoization is not merely dormant outside an RSC render — in a build that does not resolve the
`"react-server"` export condition, it is not present at all. `react`'s `package.json` gates
`react.react-server.js` behind that condition; the default build's `cache` is a bare passthrough
(`react@19.2.8`, `cjs/react.development.js:917-921`):

```js
exports.cache = function (fn) {
  return function () {
    return fn.apply(null, arguments);
  };
};
```

The real memoization lives only in `cjs/react.react-server.development.js:575`.

So before relying on `cache()`, confirm two things about the target:

1. **The build resolves `"react-server"`** — look for it in the bundler's resolve conditions or an
   RSC-specific environment. A standard TanStack Start Vite app does not set it: samva's
   `apps/web/vite.config.ts` declares no `resolve.conditions` and no `react-server` condition
   anywhere, so `cache()` there resolves to the passthrough above.
2. **There is an actual RSC render** — an RSC entrypoint such as `renderServerComponent`. samva has
   none, and correspondingly makes no `cache()` calls.

Verified by inspecting the resolver config and the installed package's conditional exports, not by
diffing built output.

### RSC semantics

- Create the memoized function once and share that exported function. Every call to `cache(fn)`
  returns a different memoized function with an independent cache.
- React discards all memoized entries at the server-request boundary. There is no supported
  per-entry invalidation API.
- React compares each argument with `Object.is`. Recreated objects, arrays, and functions miss even
  when their contents match; prefer primitive keys or a shared object reference.
- React caches thrown errors for the same arguments. An async function's returned promise is also
  the cached result, so callers share its fulfillment or rejection for that render.

```tsx
import { cache } from "react";

export const getUser = cache(async (userId: string) => {
  return db.users.findById(userId);
});

export async function UserPanel({ userId }: { userId: string }) {
  const user = await getUser(userId);
  return <h2>{user.name}</h2>;
}
```

Pass `userId`, not a freshly created `{ userId }`, and import this same `getUser` wherever the RSC
tree needs it.

### `cacheSignal`

React 19.2 introduced `cacheSignal()`. Use it only when the installed React version exports it and
the call runs during RSC rendering. React aborts the signal when that render completes, aborts, or
fails; outside rendering it returns `null`.

```tsx
import { cache, cacheSignal } from "react";

export const getReport = cache(async (reportId: string) => {
  const response = await fetch(`/internal/reports/${reportId}`, {
    signal: cacheSignal() as AbortSignal | null,
  });
  return response.json() as Promise<Report>;
});
```

The React 19.2 runtime returns an `AbortSignal`, while stable `@types/react` 19.2 currently models
`CacheSignal` opaquely. Keep any required assertion narrow at the platform API boundary and remove
it when the installed React types expose the signal shape.

Do not use `cacheSignal()` as a general request signal. Use the framework request's signal in
loaders, middleware, server routes, and server functions.

### Ordinary TanStack Start SSR and server functions

Make request lifetime explicit with request middleware/context. This example shares in-flight work
only inside the request that created the middleware context:

```ts
import { createMiddleware } from "@tanstack/react-start";

export const requestMemoMiddleware = createMiddleware().server(({ next }) => {
  const values = new Map<string, Promise<unknown>>();

  function requestMemo<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = values.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const pending = load();
    values.set(key, pending);
    return pending;
  }

  return next({ context: { requestMemo } });
});
```

Attach the middleware globally or to the relevant server function, then use
`context.requestMemo(key, load)`. This example intentionally shares a rejection for the remainder of
the request. Delete the key in a rejection handler only when retrying within the same request is the
desired domain behavior.

For client HttpApi data, use the atom registry described by `tanstack-start`; neither RSC `cache()`
nor request middleware replaces client cache ownership.

References:

- [React `cache`](https://react.dev/reference/react/cache)
- [React `cacheSignal`](https://react.dev/reference/react/cacheSignal)
- TanStack Start `docs/start/framework/react/guide/middleware.md` in the local
  `~/Developer/tanstack-router` checkout
