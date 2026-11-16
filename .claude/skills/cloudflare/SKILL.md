---
name: cloudflare
description:
  "Use when building, configuring, testing, or deploying Cloudflare Workers: wrangler bindings and
  migrations, the workerd request seam, Durable Objects, queues, workflows, KV/R2/D1/Hyperdrive, and
  the Workers Vitest integration. Also routes to current docs for other Cloudflare products. For
  Effect APIs use effect."
references:
  - workers
  - wrangler
  - bindings
  - queues
  - durable-objects
  - workflows
  - hyperdrive
  - static-assets
  - workers-best-practices
  - executor
argument-hint:
  "[workers | wrangler | bindings | kv | d1 | r2 | hyperdrive | queues | durable-objects | workflows
  | static-assets | workers-ai | executor | <task>]"
---

# Cloudflare platform

Consolidated skill for building on Cloudflare. Use the routing table to pick a product. Then load
the matching reference.

## Operational boundary

Inspect the target repository first. Read its package manager, installed Wrangler version, config,
generated types, and local source before you choose commands. Use that repository's Wrangler for
normal project work. Do not use a global Wrangler.

Wrangler is the repo-native workflow for local dev, generated types, config validation, resource
creation, migrations, secret mutation, deploys, and tailing. Preview or dry-run first when the
command supports it. Do not deploy or mutate account resources without explicit authorization.

Choose the narrowest Cloudflare surface before acting:

| Surface                               | Use it for                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Repo-installed Wrangler               | Project-bound Worker dev/build/config/types/migrations/tests and the established deploy flow. |
| `cf` CLI, when installed and relevant | Broad Cloudflare product/resource commands plus `cf schema` and `cf agent-context`.           |
| Executor `cloudflare_api`             | Default read-only live account/resource/deployment/configuration/telemetry evidence.          |
| Executor `cloudflare_docs`            | Official product behavior, API contracts, limits, quotas, and current documentation pages.    |

Check current local surfaces before relying on them: use the repository's Wrangler version or
package version, `cf --version`, `cf --help`, and relevant `cf schema` or `cf agent-context`
commands.

The `cf` CLI is not a fallback for an unavailable Executor server. Use the established repo Wrangler
workflow for project-bound Worker work even when `cf` also exposes a similar command.

For the runtime discovery sequence, resource identity, deployment-versus-traffic evidence,
observability sampling, Web Analytics, and Analytics Engine query boundaries, load
`references/executor.md`. It requires Executor search → describe → bounded read and keeps provider
configuration separate from source, deployed, and customer-traffic proof.

Version-gate examples. This reference is grounded at Wrangler `4.108.0`. Consumer projects may be
older. Use only APIs present in their installed types and help. Read `references/wrangler/deltas.md`
when the target repository runs an older Wrangler or a task uses the test harness, declarative
Durable Object exports, auth profiles, or a new static deploy.

## Authentication

Verify auth before `wrangler deploy`, `wrangler pages deploy`, or `npm run deploy`.

```bash
npx wrangler whoami
```

If not authenticated, read `references/wrangler/auth.md`.

Interactive local use `wrangler login` for one-time OAuth. CI/CD sets `CLOUDFLARE_API_TOKEN`.

## Routing

If invoked with an explicit product or area in `$ARGUMENTS`, load that reference directly. Known
areas include `workers`, `wrangler`, `bindings`, `kv`, `r2`, `d1`, `hyperdrive`, `queues`,
`durable-objects`, `workflows`, `static-assets`, and `workers-ai`. Otherwise use the table below.

For any hands-on Worker work, load `references/workers-best-practices/rules.md` (imperative rules
with Check/Retrieve callouts) before the product references; for a review, also load
`references/workers-best-practices/review.md` (review procedure and severity checklist). They hold
rules that apply across products. Those rules include compatibility dates, `nodejs_compat`,
generated binding types, and the Workers Vitest integration behavior. The integration auto-injects
`nodejs_compat`, so tests can pass even when the wrangler config is missing the flag.

| Task                                                                  | Reference                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Serverless functions at the edge                                      | `references/workers/`                                                                   |
| Effect Worker integration seams                                       | `references/workers/effect-worker-seams.md`                                             |
| Effect request lifetime on workerd                                    | `references/workers/effect-request-seam.md`                                             |
| Serve a built SPA or static site from a Worker                        | `references/static-assets/`                                                             |
| Stateful coordination or real-time                                    | `references/durable-objects/`                                                           |
| Strongly-consistent per-entity state                                  | `references/durable-objects/`, storage API in `references/do-storage/`                  |
| Long-running multi-step jobs                                          | `references/workflows/`                                                                 |
| Scheduled tasks                                                       | `references/cron-triggers/`                                                             |
| Expose tools to an MCP client from a Worker                           | `references/building-mcp-server/`                                                       |
| Key-value for config, sessions, or cache                              | `references/kv/`                                                                        |
| Relational SQL                                                        | `references/d1/` for SQLite, or `references/hyperdrive/` for existing Postgres or MySQL |
| Object or file storage                                                | `references/r2/`                                                                        |
| Message queue                                                         | `references/queues/`                                                                    |
| Run inference                                                         | `references/workers-ai/`                                                                |
| Build stateful AI agents                                              | `references/agents-sdk/`                                                                |
| A service on a private network via a VPC binding                      | `references/workers-vpc/`                                                               |
| Another Worker in the same account                                    | `references/bindings/`                                                                  |
| Move execution closer to the origin, not the user                     | `references/smart-placement/`                                                           |
| Image optimization or transformation                                  | `references/images/`                                                                    |
| Headless browser, screenshots, PDF rendering                          | `references/browser-rendering/`                                                         |
| CAPTCHA alternative or bot challenge on a form                        | `references/turnstile/`                                                                 |
| wrangler.jsonc keys, CLI commands, migrations, auth                   | `references/wrangler/`                                                                  |
| Declaring a binding and regenerating its types                        | `references/bindings/`                                                                  |
| Scripting Cloudflare outside Wrangler                                 | `references/api/`                                                                       |
| @cloudflare/vitest-plugin harnesses, local bindings, isolated storage | `references/miniflare/`                                                                 |
| Runtime semantics of the workerd host itself                          | `references/workerd/`                                                                   |
| Logs, traces, sampling, tail configuration                            | `references/observability/`                                                             |
| High-cardinality custom metrics written from a Worker                 | `references/analytics-engine/`                                                          |
| Live account, resource, deployment, or telemetry evidence             | `references/executor.md`                                                                |
| A product with no local reference, a current limit, or a docs path    | `references/retrieval.md`                                                               |

Each product directory holds `README.md`, `api.md`, `configuration.md`, `patterns.md`, and
`gotchas.md`. Go straight to the leaf you need. Do not route through the README first. Seven
directories carry extra or different files. Those directories are `workers/`, `wrangler/`,
`durable-objects/`, `do-storage/`, `agents-sdk/`, `workers-best-practices/`, and
`building-mcp-server/`. The table above names the ones worth loading directly.

## Retrieval

This skill holds local references where it has judgment to add. That is the `wrangler.jsonc`
surface, binding lifetimes, the workerd request seam, and test harnesses. For anything else,
retrieve the answer. Do not trust a paraphrase for a current limit, published quota, or REST
endpoint path. `references/retrieval.md` documents the verified invocations for Cloudflare docs
search, live read-only account inspection, changelog and issue search, and public-code lookup. It
also states the rule for choosing between them, and lists the docs path for each product without a
local reference (Pages, WAF, Tunnel, Terraform, Pulumi, Vectorize, AI Gateway, Containers, and the
rest).
