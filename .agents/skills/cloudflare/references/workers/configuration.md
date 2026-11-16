# Workers Configuration

## wrangler.jsonc (Recommended)

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-25", // Set this to today's date

  // Bindings (non-inheritable)
  "vars": { "ENVIRONMENT": "production" },
  "kv_namespaces": [{ "binding": "MY_KV", "id": "abc123" }],
  "r2_buckets": [{ "binding": "MY_BUCKET", "bucket_name": "my-bucket" }],
  "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "xyz789" }],

  // Environments
  "env": {
    "staging": {
      "vars": { "ENVIRONMENT": "staging" },
      "kv_namespaces": [{ "binding": "MY_KV", "id": "staging-id" }],
    },
  },
}
```

## Configuration Rules

**Inheritable**: `name`, `main`, `compatibility_date`, `routes`, `workers_dev`  
**Non-inheritable**: All bindings (`vars`, `kv_namespaces`, `r2_buckets`, etc.)  
**Top-level only**: `migrations`, `keep_vars`, `send_metrics`

`compatibility_date` rules (set to today, flag if older than 6 months):
[workers-best-practices/rules.md](../workers-best-practices/rules.md#keep-compatibility_date-current)

## Bindings

```jsonc
{
  // Environment variables - access via env.VAR_NAME
  "vars": { "ENVIRONMENT": "production" },

  // KV (key-value storage)
  "kv_namespaces": [{ "binding": "MY_KV", "id": "abc123" }],

  // R2 (object storage)
  "r2_buckets": [{ "binding": "MY_BUCKET", "bucket_name": "my-bucket" }],

  // D1 (SQL database)
  "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "xyz789" }],

  // Durable Objects (stateful coordination)
  "durable_objects": {
    "bindings": [{ "name": "COUNTER", "class_name": "Counter" }],
  },

  // Queues (message queues)
  "queues": {
    "producers": [{ "binding": "MY_QUEUE", "queue": "my-queue" }],
    "consumers": [{ "queue": "my-queue", "max_batch_size": 10 }],
  },

  // Service bindings (worker-to-worker RPC)
  "services": [{ "binding": "SERVICE_B", "service": "service-b" }],

  // Analytics Engine
  "analytics_engine_datasets": [{ "binding": "ANALYTICS" }],
}
```

### Secrets

Set via CLI (never in config):

```bash
npx wrangler secret put API_KEY
```

Access: `env.API_KEY`

### Automatic Provisioning (Beta)

Bindings without IDs are auto-created:

```jsonc
{ "kv_namespaces": [{ "binding": "MY_KV" }] } // ID added on deploy
```

## Routes & Triggers

```jsonc
{
  "routes": [{ "pattern": "example.com/*", "zone_name": "example.com" }],
  "triggers": {
    "crons": ["0 */6 * * *"], // Every 6 hours
  },
}
```

## TypeScript Setup

### Automatic Type Generation (Recommended)

```bash
npx wrangler types  # Generates worker-configuration.d.ts (runtime types + Env) from wrangler.jsonc
```

`wrangler types` supersedes `@cloudflare/workers-types`; don't install that package.

`tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
  },
  "include": ["worker-configuration.d.ts", "src/**/*"],
}
```

Import generated types:

```typescript
import type { Env } from "./worker-configuration";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await env.MY_KV.get("key"); // Fully typed, autocomplete works
    return new Response("OK");
  },
};
```

Re-run `npx wrangler types` after changing bindings in wrangler.jsonc

### Manual Type Definition (Legacy)

```typescript
interface Env {
  MY_KV: KVNamespace;
  DB: D1Database;
  API_KEY: string;
}
```

## Advanced Options

```jsonc
{
  // Auto-locate compute near data sources
  "placement": { "mode": "smart" },

  // Enable Node.js built-ins (Buffer, process, path, etc.)
  "compatibility_flags": ["nodejs_compat"],

  // Observability (10% sampling)
  "observability": { "enabled": true, "head_sampling_rate": 0.1 },
}
```

### Node.js Compatibility

`nodejs_compat` enables:

- `Buffer`, `process.env`, `path`, `stream`
- CommonJS `require()` for Node modules
- `node:` imports (e.g., `import { Buffer } from 'node:buffer'`)
- Wrangler-injected unenv polyfills for Node APIs the runtime does not implement natively, provided
  `compatibility_date` is `2024-09-23` or later

That date is also the switchover to what used to be called v2 behavior, so plain `nodejs_compat` is
all you add. Use `no_nodejs_compat_v2` only to opt back out.

**Note:** Adds ~1-2ms cold start overhead. Use Workers APIs (R2, KV) when possible

## Deployment Commands

```bash
npx wrangler deploy              # Production
npx wrangler deploy --env staging
npx wrangler deploy --dry-run    # Validate only
```

## See Also

- [API](./api.md) - Runtime APIs and bindings usage
- [Patterns](./patterns.md) - Deployment strategies
- [Wrangler](../wrangler/README.md) - CLI reference
