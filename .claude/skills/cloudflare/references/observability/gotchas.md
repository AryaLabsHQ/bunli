## Common Errors

### "Logs not appearing"

**Cause:** Observability disabled, Worker not redeployed, no traffic, low sampling rate, or log size
exceeds 256 KB **Solution:**

Inspect the repository config with Wrangler-owned tooling, then use the read-only Executor route in
[`../executor.md`](../executor.md) to check the deployed Worker settings and script-specific active
deployment. A configuration read proves collection settings only. Verify traffic separately with a
bounded telemetry, Log Explorer, Web Analytics, or Analytics Engine query; an empty result may mean
no matching traffic, disabled collection, sampling, retention, dataset access, or a query error.

### "Traces not being captured"

**Cause:** Traces not enabled, incorrect sampling rate, Worker not redeployed, or destination
unavailable **Solution:**

```jsonc
// Temporarily set to 100% sampling for debugging
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1.0,
    "traces": {
      "enabled": true,
    },
  },
}
```

Ensure `observability.traces.enabled = true`, set `head_sampling_rate` to 1.0 for testing, redeploy,
check destination status

## Limits

| Resource/Limit              | Value             | Notes                             |
| --------------------------- | ----------------- | --------------------------------- |
| Max log size                | 256 KB            | Logs exceeding this are truncated |
| Default sampling rate       | 1.0 (100%)        | Reduce for high-traffic Workers   |
| Max destinations            | Varies by plan    | Check dashboard                   |
| Trace context propagation   | 100 spans max     | Deep call chains may lose spans   |
| Analytics Engine write rate | 25 writes/request | Excess writes dropped silently    |

## Performance Gotchas

### Spectre Mitigation Timing

**Problem:** `Date.now()` and `performance.now()` have reduced precision (coarsened to 100μs)
**Cause:** Spectre vulnerability mitigation in V8 **Solution:** Accept reduced precision or use
Workers Traces for accurate timing

```typescript
// Date.now() is coarsened - trace spans are accurate
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // For user-facing timing, Date.now() is fine
    const start = Date.now();
    const response = await processRequest(request);
    const duration = Date.now() - start;

    // For detailed performance analysis, use Workers Traces instead
    return response;
  },
};
```

### Analytics Engine \_sample_interval Aggregation

**Problem:** Queries return incorrect totals when not multiplying by `_sample_interval` **Cause:**
Analytics Engine stores sampled data points, each representing multiple events **Solution:** Always
multiply counts/sums by `_sample_interval` in aggregations

```sql
-- WRONG: Undercounts actual events
SELECT blob1 AS customer_id, COUNT(*) AS total_calls
FROM api_usage GROUP BY customer_id;

-- CORRECT: Accounts for sampling
SELECT blob1 AS customer_id, SUM(_sample_interval) AS total_calls
FROM api_usage GROUP BY customer_id;
```

### Trace Context Propagation Limits

**Problem:** Deep call chains lose trace context after 100 spans **Cause:** Cloudflare limits trace
depth to prevent performance impact **Solution:** Design for flatter architectures or use custom
correlation IDs for deep chains

```typescript
// For deep call chains, add custom correlation ID
const correlationId = crypto.randomUUID();
console.log({ correlationId, event: "request_start" });

// Pass correlationId through headers to downstream services
await fetch("https://api.example.com", {
  headers: { "X-Correlation-ID": correlationId },
});
```

## Pricing and retention

### Workers Traces

Pricing, retention, and plan quotas change. Do not copy a numeric price or date into a workflow
without checking the current
[Workers Traces documentation](https://developers.cloudflare.com/workers/observability/traces/) and
the account's plan evidence. At the current documentation check, Cloudflare states that traces are
free during the initial beta and describes a future billing date; treat that as volatile provider
guidance rather than a durable repository invariant.

### Workers Logs

Check the current
[Workers Logs documentation](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
for included events, retention, sampling, and Logpush plan requirements before stating a number.

### Analytics Engine

Analytics Engine quotas, retention, and pricing are plan- and product-dependent. Verify them in the
current
[Analytics Engine SQL API documentation](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
and account evidence before making a cost or capacity decision.
