# Wrangler Development Patterns

Common workflows and best practices.

## New Worker Project

```bash
npm create cloudflare@latest my-worker && cd my-worker  # C3 — recommended
wrangler dev              # Develop locally
wrangler deploy           # Deploy
```

## Local Development

```bash
wrangler dev              # Local mode (fast, simulated)
wrangler dev --remote     # Remote mode (production-accurate)
wrangler dev --env staging --port 8787
wrangler dev --inspector-port 9229  # Enable debugging
```

Debug: chrome://inspect → Configure → localhost:9229

## Secrets

```bash
# Production
echo "secret-value" | wrangler secret put SECRET_KEY

# Local: use .dev.vars (gitignored)
# SECRET_KEY=local-dev-key
```

## Adding KV

```bash
wrangler kv namespace create MY_KV
wrangler kv namespace create MY_KV --preview
# Add to wrangler.jsonc: { "binding": "MY_KV", "id": "abc123" }
wrangler deploy
```

## Adding D1

```bash
wrangler d1 create my-db
wrangler d1 migrations create my-db "initial_schema"
# Edit migration file in migrations/, then:
wrangler d1 migrations apply my-db --local
wrangler deploy
wrangler d1 migrations apply my-db --remote

# Time Travel (restore to point in time)
wrangler d1 time-travel restore my-db --timestamp 2025-01-01T12:00:00Z
```

## Multi-Environment

```bash
wrangler deploy --env staging
wrangler deploy --env production
```

```jsonc
{ "env": { "staging": { "vars": { "ENV": "staging" } } } }
```

## Testing

### Integration Tests with Node.js Test Runner

```typescript
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestHarness, type TestHarness } from "wrangler";

describe("API", () => {
  let harness: TestHarness;

  before(async () => {
    harness = createTestHarness({
      workers: [{ configPath: "./wrangler.jsonc", secrets: { API_KEY: "fixture" } }],
    });
    await harness.listen();
  });

  after(async () => harness.close());

  it("creates user", async () => {
    const response = await harness.fetch("/api/users", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
    });
    assert.strictEqual(response.status, 201);
  });
});
```

### Testing with Vitest

Install: `npm install -D vitest@^5.0.0 @cloudflare/vitest-plugin`

**vitest.config.ts:**

```typescript
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
});
```

**tests/api.test.ts:**

```typescript
import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";

it("fetches users", async () => {
  const response = await exports.default.fetch("https://example.com/api/users");
  expect(response.status).toBe(200);
});

it("uses bindings", async () => {
  await env.MY_KV.put("key", "value");
  expect(await env.MY_KV.get("key")).toBe("value");
});
```

### Multi-Worker Development (Service Bindings)

```typescript
const harness = createTestHarness({
  workers: [
    { configPath: "./auth/wrangler.jsonc" },
    {
      configPath: "./api/wrangler.jsonc",
      bindingOverrides: { AUTH: "auth-worker" }, // Wrangler >=4.106
    },
  ],
});

// Test API calling AUTH
await harness.listen();
const response = await harness.getWorker("api-worker").fetch("/api/protected");
await harness.close();
```

### Mock External APIs

With `createTestHarness` `4.106+`, model the dependency as a service binding and replace it with a
mock Worker using `bindingOverrides`. Under `@cloudflare/vitest-plugin`, your Worker runs in its own
workerd isolate, so stubbing the host's `globalThis.fetch` does not intercept its outbound requests.
Use the workerd-aware `@msw/cloudflare` network mock instead (`msw@^2.14.1`):

```typescript
// test/network.ts
import { setupNetwork } from "@msw/cloudflare";

export const network = setupNetwork();
```

```typescript
// test/setup.ts - add to Vitest `setupFiles`
import { afterAll, afterEach, beforeAll } from "vitest";
import { network } from "./network";

beforeAll(() => network.enable());
afterEach(() => network.resetHandlers());
afterAll(() => network.disable());
```

```typescript
// in a test
import { http, HttpResponse } from "msw";
import { network } from "./network";

network.use(http.get("https://api.example.com/greeting", () => HttpResponse.json({ ok: true })));
```

The old `fetchMock` helper was removed. Do not rely on the old `startWorker({ outboundService })`
examples.

## Monitoring & Versions

```bash
wrangler tail                 # Real-time logs
wrangler tail --status error  # Filter errors
wrangler versions list
wrangler rollback [id]
```

## TypeScript

```bash
wrangler types  # Generate types from config
```

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return Response.json({ value: await env.MY_KV.get("key") });
  },
} satisfies ExportedHandler<Env>;
```

## Workers Assets

```jsonc
{ "assets": { "directory": "./dist", "binding": "ASSETS" } }
```

```typescript
export default {
  async fetch(request, env) {
    // API routes first
    if (new URL(request.url).pathname.startsWith("/api/")) {
      return Response.json({ data: "from API" });
    }
    return env.ASSETS.fetch(request); // Static assets
  },
};
```

## See Also

- [README.md](./README.md) - Commands
- [configuration.md](./configuration.md) - Config
- [api.md](./api.md) - Programmatic API
- [gotchas.md](./gotchas.md) - Issues
