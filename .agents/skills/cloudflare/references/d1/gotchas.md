# D1 Gotchas & Troubleshooting

## Common Errors

### "SQL Injection Vulnerability"

**Cause:** Using string interpolation instead of prepared statements with bind()  
**Solution:** ALWAYS use prepared statements:
`env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).all()` instead of string
interpolation which allows attackers to inject malicious SQL

### "no such table"

**Cause:** Table doesn't exist because migrations haven't been run, or using wrong database
binding  
**Solution:** Run migrations using `wrangler d1 migrations apply <db-name> --remote` and verify
binding name in wrangler.jsonc matches code

### "UNIQUE constraint failed"

**Cause:** Attempting to insert duplicate value in column with UNIQUE constraint  
**Solution:** Catch error and return 409 Conflict status code

### "Query Timeout (30s exceeded)"

**Cause:** Query execution exceeds 30 second timeout limit  
**Solution:** Break into smaller queries, add indexes to speed up queries, or reduce dataset size

### "N+1 Query Problem"

**Cause:** Making multiple individual queries in a loop instead of single optimized query  
**Solution:** Use JOIN to fetch related data in single query or use `batch()` method for multiple
queries

### "Missing Indexes"

**Cause:** Queries performing full table scans without indexes  
**Solution:** Use `EXPLAIN QUERY PLAN` to check if index is used, then create index with
`CREATE INDEX idx_users_email ON users(email)`

### "Boolean Type Issues"

**Cause:** SQLite uses INTEGER (0/1) not native boolean type  
**Solution:** Bind 1 or 0 instead of true/false when working with boolean values

### "Date/Time Type Issues"

**Cause:** SQLite doesn't have native DATE/TIME types  
**Solution:** Use TEXT (ISO 8601 format) or INTEGER (unix timestamp) for date/time values

## Limits that affect query design

See the [limits and pricing summary](./README.md#platform-limits-and-pricing) and
[official limits](https://developers.cloudflare.com/d1/platform/limits/).

- Keep each statement within 100 bound parameters, 100,000 bytes of SQL and 30 seconds.
- A string, BLOB or complete row can be at most 2,000,000 bytes; store large binaries in R2.
- The Worker-invocation query quota is 50 on Free or 1,000 on Paid. `batch()` counts as one call,
  not one per statement; its statements retain their individual-query limits.
- Each database handles queries one at a time. Throughput depends on query duration and queueing; do
  not assume a fixed requests-per-minute quota.
- Sessions preserve consistency. They do not increase query duration or require resource cleanup.

## Production Gotchas

### "A bulk query exceeds limits"

**Cause:** Too many bound parameters, oversized SQL or results, or excessive query duration.
**Solution:** Split the work into bounded statements/batches using the actual per-query limits. A
multi-row insert with two placeholders per row can fit at most 50 rows in one statement under the
100-parameter limit. Separate batches are separate transactions; preserve progress and retry
semantics when splitting work. There is no documented 1,000/10,000-statement tier cap to copy.

### "Replication reads are stale"

**Cause:** A new unconstrained session may start on a replica behind the primary, or related
requests did not carry the previous bookmark. **Solution:** Use one session for related queries, and
return/reuse `session.getBookmark()` across requests. Start a fresh session with `first-primary` if
the first query needs current primary data. A second binding to the same database ID does not select
a replica. See [Sessions API](./api.md#sessions-api).

### "Migration applied to local but not remote"

**Cause:** Forgot `--remote` flag when applying migrations  
**Solution:** Always run `wrangler d1 migrations apply <db-name> --remote` for production

### "Foreign key constraint failed"

**Cause:** Inserting row with FK to non-existent parent, or deleting parent before children  
**Solution:** Enable FK enforcement: `PRAGMA foreign_keys = ON;` and use ON DELETE CASCADE in schema

### "BLOB data corrupted on export"

**Cause:** D1 export may not handle BLOB correctly  
**Solution:** Store binary files in R2, only store R2 URLs/keys in D1

### "Database size approaching limit"

**Cause:** Storing too much data in single database  
**Solution:** Horizontal scale-out: create per-tenant/per-user databases, archive old data, or
upgrade to paid plan

### "Local dev vs production behavior differs"

**Cause:** Local uses SQLite file, production uses distributed D1 - different performance/limits  
**Solution:** Always test migrations on remote with `--remote` flag before production rollout
