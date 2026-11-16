# Bindings API Reference

## TypeScript Types

Cloudflare generates binding types via `npx wrangler types`. This creates a single
`worker-configuration.d.ts` containing both the Workers runtime types and your `Env` interface — it
supersedes `@cloudflare/workers-types`.

### Generated Env Interface

After running `wrangler types`, TypeScript knows your bindings:

```typescript
interface Env {
  // From wrangler.jsonc bindings
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  DB: D1Database;
  MY_SERVICE: Fetcher;
  AI: Ai;

  // From vars
  API_URL: string;

  // From secrets (set via wrangler secret put)
  API_KEY: string;
}
```

### Binding Types

Types come from the generated `worker-configuration.d.ts` (runtime + `Env`):

| Config                                                     | TypeScript Type          | Source                      |
| ---------------------------------------------------------- | ------------------------ | --------------------------- |
| `kv_namespaces`                                            | `KVNamespace`            | `worker-configuration.d.ts` |
| `r2_buckets`                                               | `R2Bucket`               | `worker-configuration.d.ts` |
| `d1_databases`                                             | `D1Database`             | `worker-configuration.d.ts` |
| `durable_objects.bindings`                                 | `DurableObjectNamespace` | `worker-configuration.d.ts` |
| `vectorize`                                                | `VectorizeIndex`         | `worker-configuration.d.ts` |
| `queues.producers`                                         | `Queue`                  | `worker-configuration.d.ts` |
| `services`                                                 | `Fetcher`                | `worker-configuration.d.ts` |
| `ai`                                                       | `Ai`                     | `worker-configuration.d.ts` |
| `browser`                                                  | `BrowserRun`             | `worker-configuration.d.ts` |
| `analytics_engine_datasets`                                | `AnalyticsEngineDataset` | `worker-configuration.d.ts` |
| `hyperdrive`                                               | `Hyperdrive`             | `worker-configuration.d.ts` |
| `rate_limiting`                                            | `RateLimit`              | `worker-configuration.d.ts` |
| `workflows`                                                | `Workflow`               | `worker-configuration.d.ts` |
| `mtls_certificates` / `vars` / `text_blobs` / `data_blobs` | `string`                 | Built-in                    |
| `wasm_modules`                                             | `WebAssembly.Module`     | Built-in                    |

## Accessing Bindings

### Method 1: fetch() Handler (Recommended)

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const value = await env.MY_KV.get("key");
    return new Response(value);
  },
};
```

**Why:** Type-safe, aligns with Workers API, supports ctx for waitUntil/passThroughOnException.

### Method 2: Hono Framework

```typescript
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const value = await c.env.MY_KV.get("key");
  return c.json({ value });
});

export default app;
```

**Why:** c.env auto-typed, ergonomic for routing-heavy apps.

### Method 3: Module Workers (Legacy)

```typescript
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const value = await env.MY_KV.get("key");
  return new Response(value);
}

addEventListener("fetch", (event) => {
  // env not directly available - requires workarounds
});
```

**Avoid:** Use fetch() handler instead (Method 1).

## Type Generation Workflow

### Initial Setup

```bash
# Install wrangler
npm install -D wrangler

# Generate types from wrangler.jsonc
npx wrangler types
```

### After Changing Bindings

```bash
# Added/modified binding in wrangler.jsonc
npx wrangler types

# TypeScript now sees updated Env interface
```

**Note:** `wrangler types` outputs a single `worker-configuration.d.ts` (runtime types + `Env`). Add
it to your `tsconfig.json` `"include"` array; it supersedes `@cloudflare/workers-types`, so
uninstall that package and drop it from `"types"`.

## Key Binding Methods

**KV:**

```typescript
await env.MY_KV.get(key, { type: "json" }); // text|json|arrayBuffer|stream
await env.MY_KV.put(key, value, { expirationTtl: 3600 });
await env.MY_KV.delete(key);
await env.MY_KV.list({ prefix: "user:" });
```

**R2:**

```typescript
await env.BUCKET.get(key);
await env.BUCKET.put(key, value);
await env.BUCKET.delete(key);
await env.BUCKET.list({ prefix: "images/" });
```

**D1:**

```typescript
await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
await env.DB.batch([stmt1, stmt2]);
```

**Service:**

```typescript
await env.MY_SERVICE.fetch(new Request("https://fake/path"));
```

**Workers AI:**

```typescript
await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt: "Hello" });
```

**Queues:**

```typescript
await env.MY_QUEUE.send({ userId: 123, action: "process" });
```

**Durable Objects:**

```typescript
const id = env.MY_DO.idFromName("user-123");
const stub = env.MY_DO.get(id);
await stub.fetch(new Request("https://fake/increment"));
```

## Generated Types

`wrangler types` now emits the Workers runtime types **and** your `Env` interface into a single
`worker-configuration.d.ts`. This supersedes `@cloudflare/workers-types` — uninstall it and remove
it from `tsconfig.json`.

```bash
# Uninstall the superseded package, then regenerate
npm uninstall @cloudflare/workers-types
npx wrangler types
```

Re-run `wrangler types` after every binding/config change.

## Type Safety Best Practices

1. **Never use `any` for env:**

```typescript
// ❌ BAD
async fetch(request: Request, env: any) { }

// ✅ GOOD
async fetch(request: Request, env: Env) { }
```

2. **Run wrangler types after config changes:**

```bash
# After editing wrangler.jsonc
npx wrangler types
```

3. **Check generated types match config:**

```bash
# View generated runtime + Env types
cat worker-configuration.d.ts
```

## See Also

- [Workers Types Package](https://www.npmjs.com/package/@cloudflare/workers-types)
- [Wrangler Types Command](https://developers.cloudflare.com/workers/wrangler/commands/#types)
