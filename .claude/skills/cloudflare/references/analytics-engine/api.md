# Analytics Engine API Reference

## Writing Data

### `writeDataPoint()`

Fire-and-forget (returns `void`, not Promise). Writes happen asynchronously.

```typescript
interface AnalyticsEngineDataPoint {
  blobs?: string[]; // Up to 20 strings (dimensions), 16KB each
  doubles?: number[]; // Up to 20 numbers (metrics)
  indexes?: string[]; // At most one index string for high-cardinality filtering
}

env.ANALYTICS.writeDataPoint({
  blobs: ["/api/users", "GET", "200"],
  doubles: [145.2, 1], // latency_ms, count
  indexes: ["customer_abc123"],
});
```

**Behaviors:** No await needed, no error thrown (check tail logs), auto-sampled at high volumes,
auto-timestamped.

**Blob vs Index:** Blob for GROUP BY (<100k unique), Index for filter-only (millions unique).

### Full Example

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now();
    const url = new URL(request.url);
    try {
      const response = await handleRequest(request);
      env.ANALYTICS.writeDataPoint({
        blobs: [url.pathname, request.method, response.status.toString()],
        doubles: [Date.now() - start, 1],
        indexes: [request.headers.get("x-api-key") || "anonymous"],
      });
      return response;
    } catch (error) {
      env.ANALYTICS.writeDataPoint({
        blobs: [url.pathname, request.method, "500"],
        doubles: [Date.now() - start, 1, 0],
      });
      throw error;
    }
  },
};
```

## SQL API (External Only)

```bash
curl -X POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql \
  -H "Authorization: Bearer $TOKEN" \
  -d "SELECT blob1 AS endpoint, SUM(_sample_interval) AS requests FROM dataset WHERE timestamp >= NOW() - INTERVAL '1' HOUR GROUP BY blob1"
```

### Column References

```sql
-- blob1..blob20, double1..double20, index1, timestamp
SELECT blob1 AS endpoint,
  SUM(_sample_interval * double1) AS latency,
  SUM(_sample_interval) AS requests
FROM my_dataset
WHERE index1 = 'customer_123' AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob1
HAVING SUM(_sample_interval) > 100
ORDER BY requests DESC LIMIT 100
```

**Aggregations:** `SUM()`, `AVG()`, `COUNT()`, `MIN()`, `MAX()`, `quantile(0.95)()`

**Time ranges:** `NOW() - INTERVAL '1' HOUR`, `BETWEEN '2026-01-01' AND '2026-01-31'`

### Query Examples

```sql
-- Top endpoints
SELECT blob1,
  SUM(_sample_interval) AS requests,
  SUM(_sample_interval * double1) / SUM(_sample_interval) AS avg_latency
FROM api_requests WHERE timestamp >= NOW() - INTERVAL '24' HOUR
GROUP BY blob1 ORDER BY requests DESC LIMIT 20

-- Error rate
SELECT blob1,
  SUM(_sample_interval) AS total,
  SUM(_sample_interval * CASE WHEN blob3 LIKE '5%' THEN 1 ELSE 0 END) AS errors
FROM api_requests WHERE timestamp >= NOW() - INTERVAL '1' HOUR
GROUP BY blob1 HAVING total > 50

-- P95 latency
SELECT blob1, quantile(0.95)(double1) AS p95
FROM api_requests GROUP BY blob1
```

## Response and evidence envelope

```json
{ "data": [{ "endpoint": "/api/users", "requests": 1523 }], "rows": 2 }
```

For a live read, record the dataset, explicit time range, account and tool identity, fetch time,
response errors, row count, and any sampling metadata. A binding or dataset name establishes
configuration; it does not prove that the Worker wrote traffic in the requested window. Use
Executor's [`search → describe → bounded read`](../executor.md) flow to discover the current live
route rather than copying a saved connection or endpoint shape.

## Limits

| Resource                | Limit                                            |
| ----------------------- | ------------------------------------------------ |
| Blobs/Doubles per point | 20 each                                          |
| Indexes per point       | 1                                                |
| Blob/Index size         | 16KB                                             |
| Data retention          | Plan- and product-dependent; verify current docs |
| Query timeout           | Verify current API/docs response                 |

**Critical:** Cloudflare may sample Analytics Engine data at high volumes, on write or read. Use
`_sample_interval` for weighted aggregations and verify current limits in the
[official SQL API documentation](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
before stating a threshold, retention period, quota, or price.
