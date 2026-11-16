# Executor: live Cloudflare evidence

Use Executor for read-only inspection of the account and resources that are actually connected to
Cloudflare. Use the target repository's Wrangler for project-local development, config validation,
generated types, bindings, migrations, resource creation, secrets, and deploys. Do not turn an
Executor read into a Wrangler or API mutation, and do not use a provider read as proof that a
repository's source or a deployed version is correct.

This reference was checked against the connected Executor Cloudflare API and the current Cloudflare
documentation on 2026-09-12. Tool catalogs, response fields, retention, quotas, and pricing can
change; discover and describe the route again when the question depends on a volatile detail.

## Discovery contract

The preferred Executor family map lives at the Cloudflare skill routing boundary in the top-level
skill: use `cloudflare_api` for live state and `cloudflare_docs` for official product behavior and
contracts. This reference covers the `cloudflare_api` lane; use the same runtime discovery sequence
for the docs lane when a current documentation page or contract is required.

Executor connections and tool paths are installation-specific. Never copy a saved connection address
from an example into a skill or assume that a particular owner or connection exists in the next
harness. Broaden discovery only when that family lacks the needed capability or another current
operation is a better fit. Discover the connection and route at runtime:

```ts
const connections = await tools.executor.coreTools.connections.list({});
const cloudflare = connections.data.connections.find(
  (connection) => connection.integration === "cloudflare_api",
);
if (!cloudflare) {
  return { status: "unavailable", reason: "No Cloudflare API connection is configured" };
}

const matches = await tools.search({
  namespace: "cloudflare_api",
  query: "list Cloudflare accounts",
  limit: 8,
});
const accountPath = matches.items.find((item) => /accounts.*list/i.test(item.path))?.path;
if (!accountPath) return { status: "unavailable", reason: "Account listing route not discovered" };

const accountTool = await tools.describe.tool({ path: accountPath });
const accounts = await tools[accountPath]({ page: 1, per_page: 25, direction: "asc" });
if (!accounts.ok) {
  return { status: "error", error: accounts.error };
}
const expectedAccountId = request.accountId;
const expectedAccountName = request.accountName;
if (!expectedAccountId && !expectedAccountName) {
  return { status: "needs_input", reason: "An expected Cloudflare account identity is required" };
}
const candidates = (accounts.data.result ?? []).filter((account) =>
  expectedAccountId && expectedAccountName
    ? account.id === expectedAccountId && account.name === expectedAccountName
    : expectedAccountId
      ? account.id === expectedAccountId
      : account.name === expectedAccountName,
);
if (candidates.length !== 1) {
  return { status: "unavailable", reason: "Expected account did not resolve uniquely" };
}
const account = candidates[0];
```

The sequence is always search, describe, then call. Use the described input and output shapes; do
not guess endpoint names, parameter names, or pagination fields. Executor calls return a wrapper:

```text
{ ok: true, data, http? } | { ok: false, error }
```

On a successful read, preserve the account or resource identifier, the discovered tool path, the
request bounds, the fetch time, HTTP status, response errors/messages, and any `result_info` or
provider freshness field. Return a small evidence envelope rather than dumping an entire account:

```ts
const envelope = result.ok
  ? {
      ok: true,
      fetchedAt: new Date().toISOString(),
      httpStatus: result.http?.status,
      resultInfo: result.data.result_info,
      count: result.data.result?.length,
      sample: result.data.result?.slice(0, 3),
    }
  : { ok: false, error: result.error };
```

Treat a missing connection, permission error, empty page, stale timestamp, and an API error as
different evidence states. Do not silently substitute a dashboard screenshot, a repository config,
or a guessed account. For list routes, request a small first page and follow the returned pagination
metadata only when the decision requires complete coverage. The Cloudflare account and Web Analytics
list routes are page-based; a list of deployments is scoped to one script and the first deployment
is the one currently serving traffic according to the API.

## Identity and resource inventory

Resolve identity in this order:

1. Require an expected account ID or an exact account name from the request, then list accounts and
   resolve exactly one returned immutable account ID. If the expected account is absent, paginated
   beyond the first page, or ambiguous, stop with a needs-input/unavailable evidence state instead
   of selecting the first account.
2. List Workers for that account with a bounded page. Use the returned Worker `name` as the script
   name for a deployment or version lookup and retain its `id` as the provider resource identity.
3. Resolve domains, zones, queues, Durable Objects, and service references from the Worker's
   returned `references`; these are provider relationships, not proof that the referenced source is
   present in the current checkout.
4. List Web Analytics sites for the same account. Record `site_tag`, creation time, pagination
   metadata, and the associated ruleset zone name/tag when present. A Web Analytics site or enabled
   ruleset is configuration evidence; it is not traffic evidence.

Use the current Cloudflare API pages for the resource shapes:
[List Workers](https://developers.cloudflare.com/api/operations/worker-script-list-workers/),
[List deployments](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/),
and
[List Web Analytics sites](https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/list/).

## Deployment and source evidence

Deployment state needs a script-specific read. Discover and describe the deployment list route, then
call it with the account ID and the Worker `name`:

```ts
const deployments = await tools[deploymentPath]({
  account_id: accountId,
  script_name: worker.name,
});
```

The result contains deployments with an ID, creation time, source, strategy, and version
percentages. The first item is the latest deployment actively serving traffic. A versions list is
useful for version history and deployability, but it does not replace the deployment read when the
question is “what is serving now?”. Compare the deployment's version IDs and timestamps with the
repository commit, Wrangler config, and hosted release evidence before claiming source parity.

Do not infer traffic from any of these alone:

- `deployed_on`, `updated_on`, or a successful deploy command;
- a Worker appearing in `listWorkers`;
- `observability.enabled`, `logs.enabled`, or `traces.enabled`;
- a Web Analytics site or ruleset being enabled;
- a version existing in the version history.

Those fields establish provider state or collection configuration. Traffic requires a telemetry, Log
Explorer, Analytics Engine, GraphQL, or Web Analytics data read with a bounded time range and
freshness context. The
[Cloudflare deployment API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/)
documents the active-first ordering and the version percentage model.

## Observability and traffic

The Worker inventory and settings routes expose observability configuration, including enabled
status, log and trace sampling, persistence, destinations, and invocation-log settings. Use that to
answer “is collection configured?” and “what sampling could affect the result?”. Cloudflare's
current docs define `head_sampling_rate` as a value from 0 to 1 and default it to 1 when omitted;
sampling is head-based, so a query over logs or traces is not automatically a complete request
count. [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
and [Workers Traces](https://developers.cloudflare.com/workers/observability/traces/) describe the
current behavior.

For actual telemetry, discover the current route instead of assuming that the dashboard and API use
the same query shape. The connected catalog currently exposes Workers Observability query and Log
Explorer query routes. Describe the selected route, use a narrow time window and an explicit Worker
or dataset filter, and retain its result statistics, row/event count, and query timestamp. If the
route is unavailable or permission-denied, report that telemetry was not verified.

```ts
const datasets = await tools[datasetsPath]({ account_id: accountId, include_zones: false });
// Inspect enabled account-level datasets before constructing a Log Explorer query.
const telemetry = await tools[queryPath]({
  account_id: accountId,
  body: "SELECT ... WHERE timestamp >= now() - INTERVAL '1' HOUR LIMIT 100",
});
```

Use [Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/) and
[Log Explorer](https://developers.cloudflare.com/logs/log-explorer/) for the current query grammar.
A successful configuration read plus zero rows means “no matching evidence in this window”, not “the
Worker has no traffic”; distinguish an empty window, disabled collection, sampling, dataset
availability, retention, and query failure.

## Web Analytics and Analytics Engine

Web Analytics configuration answers which sites are registered and how their rulesets are attached.
It does not establish page views. Use a current Web Analytics data or GraphQL read for traffic,
bounded by a time range; retain the site tag/zone identity and the data query's freshness and
sampling limitations. The
[Web Analytics limits](https://developers.cloudflare.com/web-analytics/limits/) page is the source
for current site and rules limits.

Analytics Engine is a custom event store. The Worker binding writes data points; an external SQL
read is the evidence path. Use the one `index1` field for high-cardinality filtering and keep
low-cardinality dimensions in blobs. If rows are sampled, `_sample_interval` says how many original
rows each returned row represents. Weight counts and sums accordingly:

```sql
SELECT
  index1 AS customer_id,
  SUM(_sample_interval) AS events,
  SUM(_sample_interval * double1) AS total_value
FROM my_dataset
WHERE timestamp >= NOW() - INTERVAL '24' HOUR
GROUP BY index1
```

Do not use `COUNT(*)` as an exact event total when sampling may apply, and do not present an
Analytics Engine dataset or binding as proof that traffic was written. Confirm the dataset, query
window, returned row count, `_sample_interval`, and response errors. See the current
[Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
guidance for sampling and weighted aggregations. Current retention, quotas, and pricing are
volatile; cite that page or the account plan evidence before stating a numeric limit.

## Mutation boundary

Executor guidance in this reference is read-only. Do not create or update Web Analytics sites,
rules, Logpush jobs, observability settings, deployments, versions, bindings, datasets, secrets, DNS
records, or account configuration through discovered API routes. Use the target repository's
Wrangler or the explicitly authorized Cloudflare workflow for a requested mutation, with a dry run
or preview where available. A live read may inform a decision; it never grants permission for the
next write.
