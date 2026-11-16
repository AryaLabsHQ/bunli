# Retrieval — Cloudflare Facts This Skill Does Not Hold

This skill keeps local references only where it holds judgment a vendor page cannot give you: the
`wrangler.jsonc` surface, binding lifetimes, the workerd request seam, test harnesses. Everything
else is retrieved on demand.

Retrieval beats mirroring for one measurable reason. The skill previously carried a paraphrase of
`developers.cloudflare.com` for 61 products with no date or provenance marker anywhere in it, and it
went stale silently — the `nodejs_compat_v2` prescription below is a real bug that shipped in this
skill and survived because nothing re-checked the source. A single search re-derives it from
Cloudflare's own words. Prefer the round trip over a paraphrase you cannot date.

Every invocation on this page was run before it was written down. Where a call has a quirk, the
quirk is recorded because it was hit.

## Routing

Pick the narrowest source that can answer the question.

| Question shape                                                               | Source                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| Config keys, bindings, lifetimes, test harness, request seam                 | The local `references/` subtrees in SKILL.md |
| Any product without a local subtree; current limits; a doc path              | Executor `cloudflare_docs`                   |
| Whether a flag/behavior changed, and when; upstream reasoning; a known issue | exa (changelogs, GitHub, blog posts)         |
| "What is actually deployed in my account right now"                          | Executor `cloudflare_api` (read-only)        |
| "Docs describe this API but not how anyone uses it"                          | `code_grep`, `deepwiki`                      |

Two rules that decide the last two rows:

- **Wrangler owns mutation.** Local dev, deploys, generated types, migrations, bindings, resource
  creation, secret writes — all through the target repo's own Wrangler. Never mutate an account
  through `cloudflare_api`.
- **Executor owns inspection.** Use the read-only Executor family selected by the integration map in
  the top-level skill, then dynamically search and describe the current operation. Do not reach for
  `wrangler` subcommands to inspect what that read answers directly.

## If the tools below are not available

Every connection this file names is a **saved Executor connection on the machine it was written
on**, not a universal capability. This skill is installed in several repos and may run under a
harness with none of them. Enumerate what you actually have before assuming:

```ts
await tools.executor.coreTools.connections.list({});
// → [{ address, integration: "cloudflare_docs", … }, …]
```

Work down this ladder and stop at the first rung available. Every rung answers the common case —
"what does Cloudflare say about X right now":

1. **Executor + the discovered `cloudflare_docs` documentation-search operation** (below). Best
   precision per call; goes straight to the passage.
2. **Any generic web search and fetch tool**, scoped to `developers.cloudflare.com`. Slower and
   noisier, but the docs are public and fully indexed — nothing here depends on privileged access.
3. **The product → docs-path table in
   [Products without local references](#products-without-local-references)**, which needs nothing
   but the ability to fetch a URL:

   ```bash
   curl -s https://developers.cloudflare.com/workers/llms.txt            # page list for a section
   curl -s -H "Accept: text/markdown" \
     https://developers.cloudflare.com/workers/configuration/compatibility-flags/
   # → content-type: text/markdown; charset=utf-8, with YAML frontmatter
   ```

   No auth, no tooling. This rung covers all 38 delegated products.

Two capabilities do **not** degrade, because no public document holds their answers. State the limit
rather than substituting a guess:

- **Live account state** needs `cloudflare_api`. Without it, the answer is "I cannot see what is
  deployed" — or ask the operator to run the matching read-only `wrangler` command in the target
  repo.
- **Changelog, issue, and upstream-reasoning search** needs a web-search tool. Without one, cite the
  docs page and say the change history was not checked.

Name the missing connection when you hit this. Do not paper over it by writing what the docs
probably say — that is the exact failure this file replaced.

## Cloudflare docs search

The primary source for any product this skill does not carry locally.

```ts
// mcp__executor__execute
const docsSearch = await tools.search({
  namespace: "cloudflare_docs",
  query: "search Cloudflare documentation",
  limit: 8,
});
const docsPath = docsSearch.items.find((item) =>
  /documentation.*search|search.*documentation/i.test(item.path),
)?.path;
if (!docsPath)
  return { status: "unavailable", reason: "Documentation search route not discovered" };
const docsTool = await tools.describe.tool({ path: docsPath });
// Use docsTool's current input shape; this catalog currently accepts `{ query }`.
const r = await tools[docsPath]({
  query: "nodejs_compat compatibility flag Hyperdrive postgres driver",
});
```

Input is exactly `{ query: string }`. On success `r.data.content` is an array of MCP text blocks,
each holding one or more results in this shape:

```
<result>
<url>https://developers.cloudflare.com/https://developers.cloudflare.com/workers/wrangler/configuration/</url>
<title></title>
<text>… page excerpt …</text>
</result>
```

Three things to know about that payload:

1. **Normalize duplicated URL prefixes only when present.** If `url` starts with
   `https://developers.cloudflare.com/https://developers.cloudflare.com/`, strip the first
   `https://developers.cloudflare.com/` exactly once. Preserve an already-valid URL.
2. **Use the returned title when present.** If `<title>` is empty, take the title from the page.
3. **It is semantic, not lexical.** Describing the intent beats keyword soup:
   `"nodejs_compat compatibility flag Hyperdrive postgres driver"` lands the Wrangler configuration
   page; `"c3"` returns four unrelated tutorials. Product-name-only queries are the weak case — for
   those, go straight to the docs-path table in
   [Products without local references](#products-without-local-references).

It also has a real failure mode: **the page it returns can itself be stale.** The Hyperdrive binding
example on `/workers/wrangler/configuration/` still writes
`"compatibility_flags": ["nodejs_compat_v2"]`, while `/workers/configuration/compatibility-flags/`
states that `nodejs_compat` plus a compatibility date of 2024-09-23 or later is what enables it.
When two Cloudflare pages disagree, the compatibility-flags and runtime-API references win over a
config example, and the installed `wrangler`/`miniflare` source in the target repo wins over both.

### When search is the wrong shape

Semantic search returns a passage. When you need the _shape_ of a product's docs — every page, to
pick the right one — enumerate the section index instead: `<section>/llms.txt`, per rung 3 above.
`/workers/`, `/waf/`, and `/bots/` were all verified, the last of which publishes an index its
rendered page never advertises, so try it even where nothing announces it.

## Live account and resource state

Read-only inspection of what is actually deployed.

For the complete portable workflow, load [`executor.md`](executor.md). It covers connection and
route discovery, account/resource identity, bounded response envelopes, deployment state,
observability configuration versus traffic, Web Analytics, Analytics Engine sampling, and the
read-only mutation boundary. The examples below are retained as a compact route-discovery reminder;
their connection address is machine-specific and must be discovered at runtime.

Hundreds of tools may be exposed under a discovered `cloudflare_api` path, so discover instead of
guessing:

```ts
// mcp__executor__execute
const s = await tools.search({
  query: "list workers scripts for account",
  namespace: "cloudflare_api",
  limit: 8,
});
const workerListPath = s.items[0]?.path;
if (!workerListPath) return { status: "unavailable", reason: "Worker route not discovered" };
const d = await tools.describe.tool({ path: workerListPath });
// d.inputTypeScript      → "{ account_id: WorkersIdentifier; tags?: string; }"
// d.outputTypeScript     → "{ ok: true; data: … } | { ok: false; error: ToolError }"
// d.typeScriptDefinitions → named shapes referenced above
```

Then call it with the discovered rootless path through bracket notation. The `tools.` root is part
of the runtime object, not part of the string returned by search or passed to
`tools[workerListPath]`:

```ts
const accountSearch = await tools.search({
  query: "list Cloudflare accounts",
  namespace: "cloudflare_api",
  limit: 8,
});
const accountPath = accountSearch.items.find((item) => /accounts.*list/i.test(item.path))?.path;
if (!accountPath) return { status: "unavailable", reason: "Account route not discovered" };
const accts = await tools[accountPath]({ page: 1, per_page: 25 });
if (!accts.ok) return accts.error;
const expectedAccountId = "<account id supplied by the caller>";
const account = accts.data.result?.find((candidate) => candidate.id === expectedAccountId);
if (!account) return { status: "needs_input", reason: "Expected account ID did not resolve" };
const accountId = account.id;

const scripts = await tools[workerListPath]({
  account_id: accountId,
});
// scripts.data.result[n] → { id, compatibility_date, compatibility_flags, has_assets,
//                            placement: { mode }, observability, routes, … }
```

Path quirks, both hit while verifying this file:

- **`tools.search` and `tools.describe.tool` take the path _without_ the `tools.` root**
  (`cloudflare_api.<owner>.<connection>.<tool>`), while
  `tools.executor.coreTools.connections.list({})` returns an `address` that _includes_ it. Bracket
  invocation passes the rootless string directly; only explicit dot notation writes `tools.` in the
  expression. Mixing them up yields `tool_not_found`.
- **`tool_not_found` errors carry `details.suggestions`.** A wrong guess is cheap: the error names
  the near-miss paths, which is faster than searching again.

What this answers that no document can: the deployed `compatibility_date` per Worker, which scripts
have assets attached, live `placement.mode`, current observability sampling, and route bindings —
i.e. the drift between a repo's `wrangler.jsonc` and production.

Do not treat those settings as traffic evidence. To establish traffic, discover a current telemetry,
Log Explorer, Web Analytics data, GraphQL, or Analytics Engine query route, bound the time window
and result size, and record sampling/freshness metadata. A Worker listing, enabled observability,
Web Analytics registration, or deployment timestamp only establishes provider configuration or
release state.

## exa — changelogs, issues, upstream reasoning

Docs search finds the current page. It does not tell you what changed, when, or why. exa does.

```ts
// mcp__exa__web_search_exa
{
  query:
    "Cloudflare Workers nodejs_compat_v2 deprecated superseded by nodejs_compat compatibility date 2024-09-23",
  numResults: 4,
}
// then, for full text of the best hits:
// mcp__exa__web_fetch_exa { urls: [...], maxCharacters: 300 }
```

That exact query is the worked example that motivated this file. It returned, in one call:

- `/workers/runtime-apis/nodejs/` — "add the `nodejs_compat` compatibility flag … and ensure that
  your Worker's compatibility date is 2024-09-23 or later."
- `/workers/configuration/compatibility-flags/` — the same rule, with `2024-09-23` as the "Default
  as of" date.
- `cloudflare/workers-sdk#6824` — "We recently added a compatibility date to allow the
  `nodejs_compat` flag to imply `nodejs_compat_v2`", with the Wrangler and Miniflare commits.
- `cloudflare/workerd#2147` — the design discussion behind the flag, including why the two flags
  were not merged outright.

The mirrored reference this skill used to carry said the opposite, and had said so for months. One
retrieval produced both the correct rule and its upstream provenance.

Same tool through Executor when you want the result inside a larger script. Note the shape differs
from the MCP tool — the request is **nested under `body`**, and a flat `{ query }` fails with
`INVALID_REQUEST_BODY`:

```ts
const exaSearch = await tools.search({ query: "web search", namespace: "exa_ai", limit: 4 });
const exaPath = exaSearch.items[0]?.path;
if (!exaPath) return { status: "unavailable", reason: "No web search route is configured" };
const ex = await tools[exaPath]({
  body: {
    query: "Cloudflare Workers static assets run_worker_first changelog",
    numResults: 2,
    type: "auto",
  },
});
// → /changelog/post/2025-06-17-advanced-routing/, /changelog/product/workers/7/
```

Reach for exa when: a flag or default may have moved; docs search returns a page that contradicts
installed types; you need the changelog entry that dates a behavior; or you want the issue thread
behind a workaround.

## code_grep — how the API is actually used

Literal code search across public GitHub, for when docs describe a signature but not a usage.

```ts
const cg = await tools.code_grep.org.default.searchgithub({
  query: "cloudflareTest",
  language: ["TypeScript"],
});
```

Input: `{ query, matchCase?, matchWholeWords?, useRegexp?, repo?, path?, language? }`. This is grep,
not keyword search — pass an identifier, an import specifier, or a config key, never a question. The
call above returns real `vitest.config.ts` files that wire `cloudflareTest()` into Vite's `plugins`
array, each with the repo license.

## deepwiki — a question about one repository

AI-answered questions grounded in a specific repo. Best for "which key does X" and "how does this
package decide Y" against `cloudflare/workers-sdk`, `cloudflare/workerd`, or a framework repo.

```ts
const dw = await tools.deepwiki.org.default.ask_question({
  repoName: "cloudflare/workers-sdk",
  question:
    "Which wrangler.jsonc key configures Workers static assets, and what run_worker_first and not_found_handling options does it accept?",
});
```

Input: `{ repoName: string | string[], question: string }` — up to 10 repos in `owner/repo` form.
The call above returned the `assets` key with `run_worker_first` accepting a boolean _or_ a route
array with `!`-prefixed exclusions, and `not_found_handling` accepting `"single-page-application"`,
`"404-page"`, or `"none"`.

Treat the answer as a lead, not a citation: confirm anything load-bearing against the installed
`wrangler` types or `config-schema.json` in the target repo, which is the version you actually build
against.

## Products without local references

These products have no reference in this skill. Fetch the docs path below, or search for the exact
question. The sections above have the invocation. All paths are relative to
`https://developers.cloudflare.com`. They match the Retrieve callouts in
[workers-best-practices/rules.md](workers-best-practices/rules.md).

| Product                | Docs path                                                |
| ---------------------- | -------------------------------------------------------- |
| AI Gateway             | `/ai-gateway/`                                           |
| AI Search              | `/ai-search/`                                            |
| API Shield             | `/api-shield/`                                           |
| Argo Smart Routing     | `/argo-smart-routing/`                                   |
| Bot Management         | `/bots/`                                                 |
| C3 `create-cloudflare` | `/workers/get-started/guide/`                            |
| Cache Reserve          | `/cache/advanced-configuration/cache-reserve/`           |
| Containers             | `/containers/`                                           |
| DDoS Protection        | `/ddos-protection/`                                      |
| Email Service          | `/email-service/`                                        |
| Email Workers          | `/email-routing/email-workers/`                          |
| GraphQL Analytics API  | `/analytics/graphql-api/`                                |
| Network Interconnect   | `/network-interconnect/`                                 |
| Pages                  | `/pages/`                                                |
| Pages Functions        | `/pages/functions/`                                      |
| Pipelines              | `/pipelines/`                                            |
| Pulumi                 | `/pulumi/`                                               |
| R2 Data Catalog        | `/r2/data-catalog/`                                      |
| R2 SQL                 | `/r2-sql/`                                               |
| Realtime SFU           | `/realtime/sfu/`                                         |
| RealtimeKit            | `/realtime/realtimekit/`                                 |
| Sandbox SDK            | `/sandbox/`, API at `/sandbox/api/`                      |
| Secrets Store          | `/secrets-store/`                                        |
| Snippets               | `/rules/snippets/`                                       |
| Spectrum               | `/spectrum/`                                             |
| Stream                 | `/stream/`                                               |
| Tail Workers           | `/workers/observability/logs/tail-workers/`              |
| Terraform              | `/terraform/`                                            |
| Tunnel                 | `/cloudflare-one/networks/connectors/cloudflare-tunnel/` |
| TURN                   | `/realtime/turn/`                                        |
| Vectorize              | `/vectorize/`                                            |
| WAF                    | `/waf/`                                                  |
| Web Analytics          | `/analytics/web-analytics/`                              |
| Workers for Platforms  | `/cloudflare-for-platforms/workers-for-platforms/`       |
| Workers Playground     | `/workers/playground/`                                   |
| Zaraz                  | `/zaraz/`                                                |

Cloudflare's own guidance is that brand-new static projects belong on Workers static assets rather
than Pages. See [static-assets/](static-assets/README.md) before reaching for the Pages rows. For
infrastructure-as-code, both provider docs live upstream. This skill covers the `wrangler.jsonc`
surface those providers wrap, in [wrangler/](wrangler/README.md).

## Writing down what you retrieve

If a retrieved fact belongs in this skill, it belongs with its provenance — the source path and the
version or date it was checked against, in the form `references/workers-best-practices/rules.md`
already uses. A fact stated without either is how the mirror this file replaced got its bugs.
