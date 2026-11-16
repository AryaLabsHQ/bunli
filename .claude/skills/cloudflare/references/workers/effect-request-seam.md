---
name: effect-request-seam
description:
  Running Effect v4 programs inside workerd request lifetimes — why HttpRouter.toWebHandler and
  ManagedRuntime are unsafe on Cloudflare Workers, how HttpWorker.toWebHandler from
  effect-platform-cloudflare owns that boundary, what the app still owns, non-HTTP entrypoint
  variants, and discharging router markers.
---

# Effect × workerd: the request seam

How an Effect v4 program is entered from a workerd `fetch` handler without cross-request state,
frozen fibers, or shared I/O. **Do not hand-roll this boundary** — `HttpWorker.toWebHandler` from
[`effect-platform-cloudflare`](https://github.com/aryasaatvik/effect-platform-cloudflare) owns it.
This file explains the lifetime model that makes the boundary necessary, which parts the package
guarantees, which parts the app still owns, and how to discharge router markers.

Failure modes below were repro-validated on `wrangler dev` against `effect@4.0.0-beta.93`/`.98`;
router types and marker kinds cited are from `effect@4.0.0-beta.102`.
`effect-platform-cloudflare@0.1.0` declares a peer floor of `effect >= 4.0.0-beta.98`.

Use with [effect-worker-seams.md](effect-worker-seams.md) (bindings/DI/test tiers) and the effect
skill's `effect` `references/ecosystem/httpapi-seams.md` (middleware order, `RequestContext`).

## The lifetime model (why this exists)

workerd's lifetime unit is the **request context** (IoContext), not the process. Every
promise/continuation is owned by the context that created it. When a context is canceled — client
disconnect, or a service-binding caller aborting its own request — the work it owns is **frozen, not
unwound**: no finalizers, no scope teardown, no signal by default.

Effect's own web-handler entry points assume process lifetime and are therefore unsafe here:

| Entry point                                          | Why it breaks on workerd                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HttpRouter.toWebHandler` (module scope)             | Internals: module `Scope.makeUnsafe` (finalizers never run), `handlerPromise ??=` (cross-request promise owned by the first request), no `ctx` slot, fiber never exposed |
| `ManagedRuntime`                                     | Module-scope cached context; build fiber forked in the first toucher's request context — same class                                                                      |
| Boot-built context + per-request I/O middleware only | Fixes I/O sharing but keeps the cross-request build promise and has no cancellation handling; ambient-MemoMap risk on any future `Effect.provide` in the boot context    |

Three concrete failure modes (all reproduced):

1. **Cross-context warnings** — "A promise was resolved or rejected from a different request
   context…" whenever a later request resumes work owned by an earlier one.
2. **Frozen-fiber isolate poisoning** — an aborted context freezes its fiber mid-flight. A frozen
   holder of module-scope state (a lock, a semaphore, an in-flight map entry) never releases it;
   every later request hangs until workerd's hang detector kills the isolate.
3. **Shared memoized I/O layers** — `Layer.build` inherits the ambient `CurrentMemoMap` from the
   fiber context. Under any module-scope boot context, concurrent requests silently share one
   memoized layer — e.g. one postgres socket across request contexts →
   `"Cannot perform I/O on behalf of a different request"` (a production incident in a public Effect
   codebase: UsefulSoftwareCo/executor#468).

The compat flag `no_handle_cross_request_promise_resolution` is not a fix — it restores
wrong-context execution and converts warnings into I/O errors (cloudflare/workers-sdk#12731).

## The seam: `HttpWorker.toWebHandler`

`HttpWorker.toWebHandler` is the Cloudflare-native counterpart to `HttpRouter.toWebHandler`: it
takes the router application layer directly, adds the router runtime, renders failures, logs
responses, and returns a standard Worker `fetch` handler.

```ts
import { HttpWorker } from "effect-platform-cloudflare";

// Module scope holds the app description and the handler. Nothing alive.
const appFetch = HttpWorker.toWebHandler(AppRouterLayer, {
  environment: Environment, // Context.Key<Environment, Env> — bindings enter once, here
  isolateLayer: HostServicesLayer, // optional; isolate-shared services only
  middleware: (httpEffect) => withRequestServices(httpEffect), // per-request services, spans
});

export default { fetch: appFetch } satisfies ExportedHandler<Env>;
```

Typed options (`effect-platform-cloudflare/dist/HttpWorker.d.ts`):

| Option          | Shape                                                               | Purpose                                                                                                       |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `environment`   | `Context.Key<Environment, Env>`                                     | Required. The app owns the key; the handler infers its `Env` parameter from it and provides bindings, no cast |
| `isolateLayer`  | `Layer.Layer<IsolateProvided, IsolateError, Environment>`           | Services safe to share across every request in one isolate                                                    |
| `middleware`    | `(effect: MiddlewareEffect<E, R>) => Effect<HttpServerResponse, …>` | Per-request services, telemetry, span parenting — same shape Effect's router Web handler accepts              |
| `routerConfig`  | `Partial<FindMyWay.RouterConfig>`                                   | Router tuning                                                                                                 |
| `disableLogger` | `boolean`                                                           | Turns off the default response logger                                                                         |

Both `Context.Service` and `Context.Reference` keys work as `environment`.

### What the package owns

Do not reimplement any of these:

- **A fresh scope per request.** The application layer is built in a new scope for every request, so
  request-owned resources cannot cross workerd event contexts. Streaming responses receive ownership
  of that scope.
- **The fiber as the declared lifetime.** The full request `Exit` is registered with the native
  `ExecutionContext.waitUntil`, so finalizers finish even when the caller disconnects.
- **Aborts as interruption.** A `Request.signal` abort interrupts the request with
  `HttpServerError.ClientAbort.annotation`.
- **Pinned isolate initialization.** The cold-build promise is registered with the native execution
  context; a failed build is closed and retried on the next request. The cached isolate context
  deliberately omits `Layer.CurrentMemoMap`, so request-time builds get a fresh memo map — failure
  mode 3 is impossible by construction even with `isolateLayer` in use.
- **Failure rendering, HEAD handling, tracing, response logging** via Effect's HTTP server
  machinery.
- **A compile-time completeness check.** `FullyProvided`/`MissingServices` infer what the app layer,
  isolate layer, and request middleware provide; any remaining non-runtime requirement fails at
  `toWebHandler` during typecheck. This supersedes a hand-written phantom-marker pin.
- **Background work as a service.** `WorkerExecutionContext.waitUntil(effect)` keeps the current
  Cloudflare event alive until a fully-provided effect settles, in an independent scope. The native
  execution context is never exposed to application code.

### What you still own

| Responsibility                                    | Notes                                                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `environment` key and generated `Env` type    | Keep `wrangler types` output committed and unedited                                                                                                                                                  |
| Which layers are request-scoped vs isolate-scoped | Database, auth, and request context belong in request middleware; only genuinely shareable services go in `isolateLayer`                                                                             |
| Module-scope discipline                           | The handler may cache only its declared isolate layer. Never cache the request router, request scope, request fiber, or request-owned I/O                                                            |
| `enable_request_signal` in wrangler compat flags  | Without it the signal never fires — direct **or** service-bound callers. With it, even service-binding caller aborts interrupt cooperatively (measured: ~41ms interrupt vs ~121ms run-to-completion) |
| Total raw routes                                  | Raw route additions must stay fully provided or `toWebHandler` fails typecheck — see [Markers and casts](#markers-and-casts)                                                                         |
| Status codes at ingress/webhook boundaries        | These are **retry semantics** (providers retry on 5xx); keep them byte-identical unless deliberately changed                                                                                         |
| Non-HTTP entrypoints                              | See [Non-HTTP entrypoints](#non-http-entrypoints)                                                                                                                                                    |
| Native dispatch above the Effect router           | Cloudflare WebSocket upgrades (status 101) must bypass Effect's response conversion to preserve the response's `webSocket` property                                                                  |

Why per-request builds are not a cost worth optimizing away: a warm full-graph build measures
**0–1ms** (cold 2ms). Schema codecs cache at module scope; there is nothing left to save by hoisting
a built context, and hoisting one is the workerd bug class above.

Full design record, alternatives rejected, and repro numbers: the consuming repo's
`docs/adr/0009-workerd-request-scoped-effect-seam.md` where it tracks ADRs. Package-side lifecycle
regressions (workerd request, streaming, abort) live in `effect-platform-cloudflare`'s own workerd
test suite — do not restate them as an app-level regression test.

## Markers and casts

- The router's `Request<"Requires">` phantom markers name exactly what raw routes resolve from the
  fiber context at request time. Discharge them by extending the request middleware's `provides` —
  **each leaked marker is a latent runtime 500** on the raw route that needs the service.
- Delete `Request<"Error">` markers by making raw routes **total**: each route renders its own typed
  failures at its boundary — `Effect.catch` into
  `HttpServerRespondable.toResponseOrElse(e, empty500)` plus a `logError`, reproducing what
  `HttpServerError.causeResponse` would do. `HttpServerResponse.jsonUnsafe` for literal bodies
  deletes the phantom `HttpBodyError` channel. The last marker standing is usually the middleware's
  own layer build failure (`SqlError`, DB unreachable) — render it inside the middleware transform
  with `Effect.catchTag`.
- **There are four marker kinds, not two.** `effect@4.0.0-beta.102`'s
  `dist/unstable/http/HttpRouter.d.ts` puts `"Requires"`, `"Error"`, `"GlobalRequires"`, and
  `"GlobalError"` in play (`:252`, `:660`, `:689`); global middleware emits the `Global*` pair.
  `HttpWorker.toWebHandler`'s `MissingServices` check covers all four — prefer it over a
  hand-written pin. If you do pin manually (e.g. in a non-HTTP sibling seam), cover every kind:

```ts
type Leaked =
  | HttpRouter.Request.Only<"Requires", Layer.Services<typeof AppRouterLayer>>
  | HttpRouter.Request.Only<"GlobalRequires", Layer.Services<typeof AppRouterLayer>>
  | HttpRouter.Request.Only<"Error", Layer.Services<typeof AppRouterLayer>>
  | HttpRouter.Request.Only<"GlobalError", Layer.Services<typeof AppRouterLayer>>;
const _pin: [Leaked] extends [never] ? true : never = true;
void _pin;
```

Zero casts is the acceptance bar.

## Non-HTTP entrypoints

| Entrypoint                                                    | Treatment                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP handlers, WorkerEntrypoint RPC, TanStack server functions | **Sibling seam**: the same run boundary without the router — per-request layer build, `Effect.runPromiseExitWith` + `{ signal }` where a request signal is reachable, `ctx.waitUntil(done)`                                                                                                     |
| Queues / cron / workflows                                     | Already per-invocation by convention — build layers at the handler / `step.do` boundary (see [effect-worker-seams.md](effect-worker-seams.md)); the HTTP seam makes `fetch` consistent with them                                                                                                |
| Durable Objects                                               | A **different lifetime model** (actor-scoped, not request-scoped). Actor-cached `ManagedRuntime`/state is correct for WebSocket actors — do not force the request seam. Hygiene instead: explicit dispose on close/hibernation, interrupt detached fibers, `ctx.waitUntil` un-awaited side work |
| Telemetry SDK singletons (Axiom, OTel provider)               | Tolerated module-scope exception **if** flushes ride `ctx.waitUntil` and the client holds no request-owned promises. Document the exception at the singleton                                                                                                                                    |

Plain promise dispatchers (e.g. a TanStack Start web worker proxying to an API worker) host no
Effect fibers and need no seam. One hygiene rule applies everywhere: never forward the inbound
request as `new Request(url, request)` into another context — rebuild method/headers/body/signal
explicitly (a request-owned body stream carried across contexts is failure mode 1).

## Related

| Topic                                    | Reference                                        |
| ---------------------------------------- | ------------------------------------------------ |
| Worker bindings, DI slots, test tiers    | [effect-worker-seams.md](effect-worker-seams.md) |
| HttpApi middleware order, RequestContext | `effect` `references/ecosystem/httpapi-seams.md` |
| Durable Objects                          | [../durable-objects/](../durable-objects/)       |
| Queues                                   | [../queues/](../queues/)                         |
| Workflows                                | [../workflows/](../workflows/)                   |
