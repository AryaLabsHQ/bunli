# Analytics Engine Configuration

## Setup

1. Add binding to `wrangler.jsonc`
2. Deploy Worker
3. Dataset created automatically on first write
4. Query via SQL API

## wrangler.jsonc

```jsonc
{
  "name": "my-worker",
  "analytics_engine_datasets": [{ "binding": "ANALYTICS", "dataset": "my_events" }],
}
```

Multiple datasets for separate concerns:

```jsonc
{
  "analytics_engine_datasets": [
    { "binding": "API_ANALYTICS", "dataset": "api_requests" },
    { "binding": "USER_EVENTS", "dataset": "user_activity" },
  ],
}
```

## TypeScript

```typescript
interface Env {
  ANALYTICS: AnalyticsEngineDataset;
}

export default {
  async fetch(request: Request, env: Env) {
    // No await - returns void, fire-and-forget
    env.ANALYTICS.writeDataPoint({
      blobs: [pathname, method, status], // String dimensions (max 20)
      doubles: [latency, 1], // Numeric metrics (max 20)
      indexes: [apiKey], // High-cardinality filter (max 1)
    });
    return response;
  },
};
```

## Data Point Limits

| Field   | Limit                 | SQL Access             |
| ------- | --------------------- | ---------------------- |
| blobs   | 20 strings, 16KB each | `blob1`...`blob20`     |
| doubles | 20 numbers            | `double1`...`double20` |
| indexes | 1 string, 16KB        | `index1`               |

## Write Behavior

| Scenario           | Behavior                                                        |
| ------------------ | --------------------------------------------------------------- |
| High-volume writes | Sampling may occur; inspect `_sample_interval` in query results |
| Invalid data       | Verify the current provider response and logs                   |

**Mitigate sampling:** Pre-aggregate, use multiple datasets, write only critical metrics.

## Query Limits

| Resource       | Limit                                            |
| -------------- | ------------------------------------------------ |
| Query timeout  | Verify current provider/API docs                 |
| Data retention | Plan- and product-dependent; verify current docs |
| Result size    | Verify current provider/API docs                 |

## Cost

Quotas and prices change. Verify current values in the
[Analytics Engine SQL API documentation](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
and account plan evidence before stating them.

## Environment-Specific

```jsonc
{
  "analytics_engine_datasets": [{ "binding": "ANALYTICS", "dataset": "prod_events" }],
  "env": {
    "staging": {
      "analytics_engine_datasets": [{ "binding": "ANALYTICS", "dataset": "staging_events" }],
    },
  },
}
```

## Monitoring

```bash
npx wrangler tail  # Check for sampling/write errors
```

```sql
-- Check write activity
SELECT DATE_TRUNC('hour', timestamp) AS hour, COUNT(*) AS writes
FROM my_dataset
WHERE timestamp >= NOW() - INTERVAL '24' HOUR
GROUP BY hour
```
