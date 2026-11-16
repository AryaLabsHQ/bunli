# Cloudflare D1 Database

Expert guidance for Cloudflare D1, a serverless SQLite database designed for horizontal scale-out
across multiple databases.

## Overview

D1 is Cloudflare's managed, serverless database with:

- SQLite SQL semantics and compatibility
- Built-in disaster recovery via Time Travel (7 days on Free, 30 days on Paid)
- Horizontal scale-out architecture (10 GB per database)
- Worker and HTTP API access
- Usage and storage pricing, plus per-database charges above the Paid inclusion

**Architecture Philosophy**: D1 is optimized for per-user, per-tenant, or per-entity database
patterns rather than single large databases.

## Quick Start

```bash
# Create database
wrangler d1 create <database-name>

# Execute migration
wrangler d1 migrations apply <db-name> --remote

# Local development
wrangler dev
```

## Core Query Methods

```typescript
// .all() - Returns all rows; .first() - First row or null; .first(col) - Single column value
// .run() - INSERT/UPDATE/DELETE; .raw() - Array of arrays (efficient)
const { results, success, meta } = await env.DB.prepare("SELECT * FROM users WHERE active = ?")
  .bind(1)
  .all();
const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
```

## Batch Operations

```typescript
// Multiple queries in single round trip (atomic transaction)
const results = await env.DB.batch([
  env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(1),
  env.DB.prepare("SELECT * FROM posts WHERE author_id = ?").bind(1),
  env.DB.prepare("UPDATE users SET last_access = ? WHERE id = ?").bind(Date.now(), 1),
]);
```

## Sessions and read replication

Use the [Sessions API](./api.md#sessions-api) for sequentially consistent queries and
[read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/). Enable
replication on the database, then use `env.DB.withSession(...)` through its existing binding.
Queries made directly on `env.DB` stay on the primary. A second binding to the same ID does not
select a replica.

Sessions track consistency with bookmarks; they do not extend query timeouts or provide an
interactive transaction. Use `batch()` for a known atomic group of statements. The
[request pattern](./patterns.md#session-bookmarks-across-requests) carries a bookmark between calls.

## Platform limits and pricing

Verified against the official [limits](https://developers.cloudflare.com/d1/platform/limits/) and
[pricing](https://developers.cloudflare.com/d1/platform/pricing/) pages on 2026-11-16. Recheck those
pages before cost estimates or designs that depend on a quota.

| Limit                         | Workers Free    | Workers Paid       |
| ----------------------------- | --------------- | ------------------ |
| Database size                 | 500 MB          | 10 GB per database |
| String, BLOB or row size      | 2,000,000 bytes | 2,000,000 bytes    |
| SQL statement size            | 100,000 bytes   | 100,000 bytes      |
| Bound parameters per query    | 100             | 100                |
| Query duration                | 30 seconds      | 30 seconds         |
| Queries per Worker invocation | 50              | 1,000              |
| Time Travel retention         | 7 days          | 30 days            |

Each statement in `batch()` retains the individual-query limits; a batch call counts once against
the queries-per-invocation limit. Do not infer a statement-count cap from that limit. Each database
processes queries serially; there is no fixed requests-per-minute allowance in this table. Bound
batches by statement size, parameters, duration and response size.

Paid includes 25 billion rows read, 50 million rows written and 5 GB of storage per month.
Additional usage costs $0.001 per million rows read, $1 per million rows written and $0.75 per
GB-month stored. It includes 100,000 databases; each additional database costs $0.10/month, even
when idle. These are D1 charges; Worker execution is billed separately. Read replication has no
extra replica fee; query usage still counts.

## CLI Commands

```bash
# Database management
wrangler d1 create <db-name>
wrangler d1 list
wrangler d1 delete <db-name>

# Migrations
wrangler d1 migrations create <db-name> <migration-name>    # Create new migration file
wrangler d1 migrations apply <db-name> --remote             # Apply pending migrations
wrangler d1 migrations apply <db-name> --local              # Apply locally
wrangler d1 migrations list <db-name> --remote              # Show applied migrations

# Direct SQL execution
wrangler d1 execute <db-name> --remote --command="SELECT * FROM users"
wrangler d1 execute <db-name> --local --file=./schema.sql

# Backups & Import/Export
wrangler d1 export <db-name> --remote --output=./backup.sql  # Full export with schema
wrangler d1 export <db-name> --remote --no-schema --output=./data.sql  # Data only
wrangler d1 time-travel restore <db-name> --timestamp="2024-01-15T14:30:00Z"  # Point-in-time recovery

# Development
wrangler dev --persist-to=./.wrangler/state
```

## Reading Order

**Start here**: Quick Start above → configuration.md (setup) → api.md (queries)

**Common tasks**:

- First time setup: configuration.md → Run migrations
- Adding queries: api.md → Prepared statements
- Pagination/caching: patterns.md
- Production optimization: Read Replication + Sessions API (this file)
- Debugging: gotchas.md

## In This Reference

- [configuration.md](./configuration.md) - wrangler.jsonc setup, migrations, TypeScript types, ORMs,
  local dev
- [api.md](./api.md) - Query methods (.all/.first/.run/.raw), batch, sessions, read replicas, error
  handling
- [patterns.md](./patterns.md) - Pagination, bulk operations, caching, multi-tenant, sessions,
  analytics
- [gotchas.md](./gotchas.md) - SQL injection, limits by plan tier, performance, common errors

## See Also

- [workers](../workers/) - Worker runtime and fetch handler patterns
- [hyperdrive](../hyperdrive/) - Connection pooling for external databases
