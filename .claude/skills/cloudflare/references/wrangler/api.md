# Wrangler Programmatic API

Grounded in Wrangler `4.108.0`. Check the target project's installed `wrangler` types before using
newer methods.

## `createTestHarness` — stable integration-test API

Use `createTestHarness` for local integration tests of complete Workers. It accepts one or more
Wrangler config files, runs production build output in a local workerd/Miniflare environment, and
owns explicit lifecycle methods.

Available since Wrangler `4.99`:

```typescript
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createTestHarness, type TestHarness } from "wrangler";

let harness: TestHarness;

before(async () => {
  harness = createTestHarness({
    workers: [{ configPath: "./wrangler.jsonc" }],
  });
  await harness.listen();
});

after(async () => {
  await harness.close();
});

test("responds", async () => {
  const response = await harness.fetch("/");
  assert.equal(response.status, 200);
});
```

Use `harness.getWorker(name)` to dispatch `fetch`/`scheduled` directly to one Worker. `reset()`
recreates storage, `update()` reloads configuration, `getLogs()` returns structured runtime logs,
and `debug()` prints a diagnostic timeline.

### Vars, secrets, and bindings

Config-file workers accept test-only overrides without mutating deployed secrets:

```typescript
const harness = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.jsonc",
      vars: { MODE: "test" },
      secrets: { API_KEY: "fixture-only" },
    },
  ],
});

const worker = harness.getWorker<Env>();
const env = await worker.getEnv(); // Wrangler >=4.104
```

Never put real production secrets in a test fixture. `getEnv()` exposes the complete configured
environment, including local secrets and bindings.

### Multiple Workers and typed exports

Wrangler `4.106+` supports binding overrides and default-export JSRPC access:

```typescript
const harness = createTestHarness({
  workers: [
    {
      configPath: "./workers/app/wrangler.jsonc",
      bindingOverrides: { BROWSER: "mock-browser" },
    },
    { configPath: "./workers/mock-browser/wrangler.jsonc" },
  ],
});

const mock = await harness
  .getWorker<MockEnv, typeof import("../../workers/mock-browser/src")>("mock-browser")
  .getExport();
```

Also in `4.106+`, Worker handles can apply D1 migrations and introspect Workflows. Verify exact
method types in the installed version.

## `unstable_startWorker` — advanced unstable dev API

The public package export is `unstable_startWorker`, not stable `startWorker`:

```typescript
import { unstable_startWorker } from "wrangler";
```

It exposes Wrangler's lower-level watch/reconfiguration development lifecycle (`ready`, `fetch`,
`setConfig`, `patchConfig`, events, and `dispose`). Keep it isolated behind project-owned test/dev
code only when `createTestHarness` cannot express the requirement. Its API can change between
Wrangler releases; do not present it as the default integration-test contract.

The unprefixed `startWorker` exists in Wrangler's internal API barrel but is re-exported from the
published package only as `unstable_startWorker`. Examples importing
`{ startWorker } from "wrangler"` are invalid against the published `4.108.0` declarations.

## `getPlatformProxy`

Use `getPlatformProxy` for Node-side scripts or unit tests that need configured bindings without
starting the Worker entrypoint:

```typescript
import { getPlatformProxy } from "wrangler";

const { env, caches, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
  environment: "test",
  persist: { path: ".wrangler/state" },
});

try {
  await env.MY_KV.put("key", "value");
  await caches.default.put("https://example.test", new Response("cached"));
} finally {
  await dispose();
}
```

Always-remote bindings, including Workers AI and AI Search, can contact the live account and may
incur usage even from local code. For a Durable Object binding with `getPlatformProxy`, official
docs require an external `script_name`; prefer the test harness for same-Worker Durable Objects.

## Version gates

| Wrangler | Harness capability                                                            |
| -------- | ----------------------------------------------------------------------------- |
| 4.99+    | `createTestHarness`, worker dispatch, server lifecycle/logging                |
| 4.101+   | per-Worker KV/R2/D1/Durable Object resource accessors                         |
| 4.104+   | `getEnv()`                                                                    |
| 4.106+   | D1 migration setup, Workflow introspection, `bindingOverrides`, `getExport()` |

Upgrade a consumer deliberately rather than copying newer calls into an older project. For runtime
tests against bindings, use the Workers Vitest integration (`@cloudflare/vitest-plugin`); it is a
separate testing path.
