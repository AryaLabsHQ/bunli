---
name: effect-worker-seams
description:
  Integration seams for Effect programs on Cloudflare Workers — bindings, HttpApi boundary, KV/DO
  runtime seams, and test fixtures. No deployment-framework-specific content.
---

# Effect Worker integration seams

Use this with the **effect** skill: `effect` `references/patterns/effect-native-architecture.md` for
the service/DI/errors house style, and `effect` `references/ecosystem/httpapi-seams.md` for
middleware and HTTP contract seams. This file owns the **Worker-host** specifics (bindings, queues,
workflows, test tiers).

## Top seam: single HTTP boundary

Expose one **Worker `fetch` handler** backed by Effect `HttpApi`. Avoid parallel routing systems
(e.g. ad hoc `HttpRouter` branch + separate `HttpApi` branch) unless migration explicitly requires
both.

How the fetch handler enters the Effect program is its own contract:
[effect-request-seam.md](effect-request-seam.md). Use `HttpWorker.toWebHandler` from
`effect-platform-cloudflare`; it builds the app per request inside the request's fiber, sends the
request Exit to `ctx.waitUntil`, and maps `request.signal` aborts to interruption.

**Do not confuse the two `toWebHandler`s.** Effect's own `HttpRouter.toWebHandler` (and
`ManagedRuntime`) must **never** be cached at module scope on workerd — its internals are the bug
(module `Scope.makeUnsafe`, a cross-request memoized build promise, no `ctx` slot). The Cloudflare
counterpart `HttpWorker.toWebHandler` is **designed** to be created once at module scope and
exported as the `fetch` handler; caching it is correct.

Public behavior is verified at this boundary first (tracer bullet).

## Bindings & DI seam (the three-slot model on Workers)

The generic shape is in the effect skill (`effect`
`references/patterns/effect-native-architecture.md`). On Workers it maps to:

| Slot                       | On Workers                                                                                                                                                                                 | Lifetime       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **`Environment`**          | A `Context.Reference<Env>` (or `Context.Service`) with **no production default**, handed to the seam as `HttpWorker.toWebHandler`'s `environment` option, which fills it once per request. | ambient        |
| **`AppConfig`**            | A `Context.Service` holding the **decoded string** env (secrets, URLs, audience) from a `@org/env` decode (`decodeServerEnv(env)`) — _not_ the bindings.                                   | isolate-stable |
| **Typed binding services** | Thin typed wrappers: `QueueService.send("queue-name", msg)`, `WorkflowProducer.start("name", params)`, an org/actor factory, `FlagService`.                                                | isolate-stable |

```ts
class Environment extends Context.Reference<Environment>()("myapp/Environment", {
  defaultValue: (): Env => {
    throw new Error("Environment not provided");
  },
}) {}

// Worker entry — the seam owns the (request, env, ctx) signature and provides the bindings
// through the environment key, so no cast and no manual context merge.
export default {
  fetch: HttpWorker.toWebHandler(AppRouterLayer, { environment: Environment }),
} satisfies ExportedHandler<Env>;
```

Two assemblies, one lifetime rule:

- **`AppServices`** (cheap constructors): merge `AppConfig` + the typed binding services into one
  layer. The layer _value_ is an inert description and may live at module scope; by default it is
  **built per request/invocation** inside the request's fiber. Do not hand-build it into a
  module-scope context — that is the workerd bug class, not an optimization (warm full-graph build
  is 0–1ms; see [effect-request-seam.md](effect-request-seam.md)).
  - **Sanctioned exception: `HttpWorker.toWebHandler`'s `isolateLayer` slot.** Services that are
    genuinely safe to share across every request in one isolate go there and are built once per
    isolate. This is safe only because the package's cached isolate context deliberately omits
    `Layer.CurrentMemoMap`, so request-time builds still get a fresh memo map. Nothing request-owned
    — no DB connection, no auth context, no request-scoped I/O — belongs in it.
- **`Middleware`** (per request): provide genuinely per-invocation services (`Database`, auth) via
  `httpEffect.pipe(Effect.provide(requestServicesLayer(env)), Effect.scoped)` inside
  `HttpRouter.middleware<{ provides }>`. No manual `MemoMap` plumbing — under the request seam each
  request's fiber starts with a fresh memo map, so cross-request layer sharing is impossible by
  construction. See `effect` `references/ecosystem/httpapi-seams.md` for the HTTP middleware order +
  the `RequestContext` seam.

| Rule                                                                                                              | Why                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate string env **once** at startup (`AppConfig`), not per request                                            | bindings are typed platform objects, not schema input — decode strings only                                                                     |
| Restrict module-level `env` reads to host assembly files (`app-services`, `app-config`, raw platform entrypoints) | those files may read `cloudflare:workers` `env` to build layers; app modules must not create module-level pools, clients, or singletons from it |
| **No** wrapper service that only forwards a binding                                                               | read `import { env } from "cloudflare:workers"` at the call site instead                                                                        |
| Keep generated binding types (`wrangler types` / `cf-typegen`) committed + unedited                               | they are the source of truth for `Env`                                                                                                          |

Misconfiguration → typed setup errors; on protected routes map to stable HTTP errors without taking
down unrelated public routes.

## Runtime seams

| Store               | Seam role                             | Testing note                                                                                 |
| ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| **KV**              | Fast read path, cache, redirect index | Integration test with Miniflare/wrangler dev or in-memory adapter behind a `Context.Service` |
| **Durable Object**  | Strong consistency, per-entity state  | Effect RPC or fetch to well-known instance id; see [durable-objects/](../durable-objects/)   |
| **D1 / Hyperdrive** | Relational data at the edge           | Prefer harness DB in API package tests where applicable                                      |

**No silent fallback:** When product rules require it (e.g. public redirect on KV miss), do **not**
fall through to DO on miss — that amplifies load and creates DDoS-shaped paths. Document the rule in
specs and `AGENTS.md`.

## DO + Effect SQL

On Durable Object SQLite, unpatched `effect` SQL `withTransaction` may **not** match Workerd DO
transaction semantics. For canonical writes inside a DO:

- Use **DO storage transaction APIs** (or an upstream sqlite-do migrator that delegates to them) for
  migration and mutation boundaries.
- Treat `@effect/sql-sqlite-do` query helpers as valid for normal reads/writes inside an outer DO
  transaction you control.

See [durable-objects/](../durable-objects/) and repo-specific `AGENTS.md` before choosing a
transaction primitive.

## Host seams: queues, workflows, cron

These run **outside** the HTTP request, so there's no `Middleware` to build per-request services —
build them at the host boundary instead.

**Queues** (`queue(batch, env, ctx)`):

- Dispatch by **exact** queue-name match (never substring) to a per-queue processor.
- Per-**message** ack/retry (not per-batch) with an explicit taxonomy: validation/permanent → drop
  (ack); rate-limit → delayed retry (`message.retry({ delaySeconds })`); transient → backoff.
- **Idempotency** via a per-tenant Durable Object `claim`/`release` before the side effect, so
  retries and at-least-once delivery don't double-execute.
- Build `Database.layer(connectionString)` (+ `Effect.scoped`) at the processor boundary; provide
  `AppServices` (config + binding services) the same way the `fetch` path does.

**Workflows** (`WorkflowEntrypoint`):

- The workflow class is a **thin async shell**; each `step.do` callback runs a self-contained
  Effect.
- **Build `Database.layer(connectionString)` _inside_ each `step.do`** — **never hold an Effect
  layer (or a live DB pool) across step boundaries.** Steps may replay/resume on a fresh isolate; a
  captured layer is invalid after a sleep.
- Use the workflow's durable primitives (`step.sleepUntil`, `step.sleep`) for scheduling; pair with
  a DO claim for exactly-once external effects.

**Cron** (`scheduled(event, env, ctx)`): same as queues — build the layer at the boundary, no
per-request middleware.

## Test seams

Two tiers, both running the **real** `PgClient` path (never mock Drizzle):

| Tier                                      | Stack                                                                                                                                                   | Use when                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Node + PGlite**                         | `@effect/vitest` + a PGlite harness (`sharedTestDb`) over in-memory Postgres + migrations                                                               | Fast service/store/SQL tests with no CF bindings                          |
| **workerd (`@cloudflare/vitest-plugin`)** | `@cloudflare/vitest-plugin` + miniflare; **Hyperdrive binding → PGlite socket** so `@effect/sql-pg` runs the real socket path; real DO / queue bindings | End-to-end behavior over real workerd primitives (DO, queues, Hyperdrive) |

| Approach                                                   | Use when                                               |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| In-memory `Layer` for domain services                      | Tracer bullets before real KV/DO                       |
| Real DO / queue bindings (`env.X` in `cloudflare:workers`) | Asserting the binding path the Node tier can only fake |
| Fixture export (`./testing` on shared packages)            | Auth JWT signing + key injection                       |

Gotchas for the workerd tier: serialize heavy DB-fan-out files (the PGlite socket server runs one
query at a time, so connection bursts flake the Hyperdrive proxy); provide `Environment` from the
real `cloudflare:workers` `env`; stub only bindings miniflare can't emulate (e.g. a feature-flag
binding). Avoid mocking global `fetch`, crypto, or JOSE when a **fixture layer** or real signed JWT
path exists.

## Optional: Cloudflare Access JWT

When the repo verifies **Cloudflare Access** at the edge:

- Model JWT header with `HttpApiSecurity` / middleware; map to a **principal** type in a shared
  package.
- Expose stable wire errors (`cloudflare_access_required`, `cloudflare_access_invalid`, …) with
  redacted HTTP messages; keep causes in typed errors/logs.
- Tests: real signed JWTs via a package `testing` export + key resolver layer swap — no fetch or
  global mocks.
- App domain identity (operator email vs service token) lives in **app middleware** above the shared
  Access layer, as a pure map from principal → app type.

Do not paste org-specific package names into skills; follow the repo’s shared auth package exports.

## Seam vocabulary

**Cloudflare Composition Seam** — the outer Cloudflare-owned location that translates raw
`Env`/ctx/bindings into app-level dependencies.

**Cloudflare RPC Context Seam** — a runtime hop where request-local ambient scope must not be
assumed to propagate; pass typed metadata explicitly.

**Cloudflare Serialization Seam** — a workerd seam requiring structured-clone/JSON-serializable
values or explicit codecs and projections.

**Agent-backed Durable Object** — a stateful Cloudflare unit implemented with the Agents SDK
`Agent`. This is the default for new DO-like units unless a lower-level reason exists.

**Canonical Stateful Object Name** — the normalized, domain-specific instance name used to address a
Durable Object or Agent.

**Stateful Object Heartbeat** — a low-frequency scheduled maintenance method for cleanup,
migrations, repairs, health metadata, and operational checks.

**Cloudflare Control Plane** — the metadata, lifecycle, and routing plane for sharded or
multi-tenant systems, kept off high-volume data paths where possible.

**Cloudflare Data Plane** — the sharded stateful resource-operation plane, reached directly on hot
paths once routing metadata is known.

## Tracer sequence (typical Worker feature)

1. Public HTTP bootstrap (one route through full handler graph).
2. Auth middleware tracer (protected route 401 → 200 with fixture credential).
3. In-memory domain service behind one mutating endpoint.
4. KV or DO adapter with one integration test.
5. Full domain rules (conflicts, parsers, compensation).

Order subsystem PRs and their commits with the `delivery` skill's
`references/seam-stack-template.md`.

## Related

| Topic                                       | Reference                                                    |
| ------------------------------------------- | ------------------------------------------------------------ |
| workerd request lifetime (the fetch seam)   | [effect-request-seam.md](effect-request-seam.md)             |
| Effect app architecture (service/DI/errors) | `effect` `references/patterns/effect-native-architecture.md` |
| HttpApi middleware order + RequestContext   | `effect` `references/ecosystem/httpapi-seams.md`             |
| Workers overview                            | [README.md](README.md)                                       |
| KV                                          | [../kv/](../kv/)                                             |
| Durable Objects                             | [../durable-objects/](../durable-objects/)                   |
| Queues                                      | [../queues/](../queues/)                                     |
| Workflows                                   | [../workflows/](../workflows/)                               |
| Hyperdrive                                  | [../hyperdrive/](../hyperdrive/)                             |
