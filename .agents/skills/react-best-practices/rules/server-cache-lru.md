---
title: Bound and Isolate Cross-Request Caches
impact: MEDIUM
impactDescription: reuses explicitly cacheable data across requests
tags: server, cache, lru, cross-request, cloudflare
---

## Bound and Isolate Cross-Request Caches

Use a process- or isolate-local LRU only when cross-request reuse is intentional. It is not an
extension of React's RSC cache and it does not provide request isolation, durable storage, or a
consistent cache shared by every server instance.

Before adding one:

- Confirm the work is measured and expensive enough to justify cache complexity.
- Cache public or immutable data where possible. For scoped data, include every tenant,
  authorization, locale, and version dimension in the key.
- Set both a size bound and TTL. Decide whether missing values and failures may be cached.
- Define invalidation from the source of truth. A TTL alone is not sufficient when stale data would
  violate correctness or authorization.
- Never store request objects, secrets, or user-specific data under a global key.

```ts
import { LRUCache } from "lru-cache";

type CatalogCacheEntry = { value: CatalogItem | null };

const catalogCache = new LRUCache<string, CatalogCacheEntry>({
  max: 500,
  ttl: 60_000,
});

export async function getCatalogItem(version: string, itemId: string) {
  const key = `${version}:${itemId}`;
  if (catalogCache.has(key)) return catalogCache.get(key)?.value ?? null;

  const item = await catalog.findById(itemId);
  catalogCache.set(key, { value: item });
  return item;
}
```

Use `has` when `null`, `false`, `0`, or an empty string is a valid cached value. For concurrent
deduplication, cache the in-flight promise deliberately and decide whether rejection removes the
entry.

### Runtime boundaries

- **Cloudflare Workers:** a warm isolate can reuse module state, but another isolate, deployment, or
  cold start has a different cache. Use the Cache API, KV, Durable Objects, or another owned service
  when the required semantics exceed opportunistic isolate-local reuse.
- **Node/serverless:** each process or instance owns a different LRU and loses it on restart.
- **One HTTP request:** prefer TanStack Start request middleware/context. See
  [server-cache-react.md](server-cache-react.md) for the RSC versus ordinary SSR decision.

Reference: [`lru-cache`](https://github.com/isaacs/node-lru-cache)
