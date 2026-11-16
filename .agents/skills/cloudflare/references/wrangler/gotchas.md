# Wrangler Common Issues

## Common Errors

### "Binding ID vs name mismatch"

**Cause:** Confusion between binding name (code) and resource ID **Solution:** Bindings use
`binding` (code name) and `id`/`database_id`/`bucket_name` (resource ID). Preview bindings need
separate IDs: `preview_id`, `preview_database_id`

### "Environment not inheriting config"

**Cause:** Non-inheritable keys not redefined per environment **Solution:** Non-inheritable keys
(bindings, vars) must be redefined per environment. Inheritable keys (routes, compatibility_date)
can be overridden

### "Local dev behavior differs from production"

**Cause:** Using local simulation instead of remote execution **Solution:** Choose appropriate
remote mode:

- `wrangler dev` (default): Local simulation, fast, limited accuracy
- `wrangler dev --remote`: Full remote execution, production-accurate, slower
- `createTestHarness` is local-only. Always-remote bindings may still contact the account; isolate
  those integrations or use explicit test doubles.

### "createTestHarness doesn't match production"

**Cause:** The stable harness runs locally. It is intended for deterministic integration tests, not
as a production probe. Verify production-specific behavior with an explicitly authorized preview
environment or live read-only telemetry; do not make routine tests depend on production data.

### "Unexpected runtime changes"

**Cause:** Missing compatibility_date **Solution:** Always set `compatibility_date`:

```jsonc
// Set this to today's date
{ "compatibility_date": "2026-07-25" }
```

When to update it and what to flag:
[workers-best-practices/rules.md](../workers-best-practices/rules.md#keep-compatibility_date-current).

### "Durable Object binding not working"

**Cause:** Missing script_name for external DOs **Solution:** Always specify `script_name` for
external Durable Objects:

```jsonc
{
  "durable_objects": {
    "bindings": [{ "name": "MY_DO", "class_name": "MyDO", "script_name": "my-worker" }],
  },
}
```

For local DOs in same Worker, `script_name` is optional.

### "Auto-provisioned resources not appearing"

**Cause:** IDs written back to config on first deploy, but config not reloaded **Solution:** After
first deploy with auto-provisioning, config file is updated with IDs. Commit the updated config. On
subsequent deploys, existing resources are reused.

### "Secrets not available in local dev"

**Cause:** Secrets set with `wrangler secret put` only work in deployed Workers **Solution:** For
local dev, use `.dev.vars`

### "Node.js compatibility error"

**Cause:** Missing Node.js compatibility flag **Solution:** Add `nodejs_compat` and keep
`compatibility_date` current. Node built-ins plus Wrangler's unenv polyfills are both enabled by
`nodejs_compat` alone for any `compatibility_date` of `2024-09-23` or later, which is what makes
drivers like `pg` (Hyperdrive) work:

```jsonc
{ "compatibility_flags": ["nodejs_compat"] }
```

There is no `nodejs_compat_v2` flag to add — it is not in wrangler's config schema, and
`nodejs_compat` already selects v2 behavior past that date. The only related flag is the opt-_out_,
`no_nodejs_compat_v2`.

### "Workers Assets 404 errors"

**Cause:** Asset path mismatch or incorrect `html_handling` **Solution:**

- Check `assets.directory` points to correct build output
- Set `html_handling: "auto-trailing-slash"` for SPAs
- Use `not_found_handling: "single-page-application"` to serve index.html for 404s

```jsonc
{
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "single-page-application",
  },
}
```

### "Placement not reducing latency"

**Cause:** Misunderstanding of Smart Placement **Solution:** Smart Placement only helps when Worker
accesses D1 or Durable Objects. It doesn't affect KV, R2, or external API latency.

```jsonc
{ "placement": { "mode": "smart" } } // Only beneficial with D1/DOs
```

### "startWorker is not exported"

**Cause:** The published package intentionally exposes the lower-level API only under its unstable
name. Use the stable harness for integration tests:

```typescript
import { createTestHarness } from "wrangler"; // Wrangler >=4.99
```

Only advanced dev-tool integrations should import `unstable_startWorker`; pin Wrangler and expect
API changes.

## Limits

| Resource/Limit            | Value            | Notes                                                                              |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Bindings per Worker       | 64               | Total across all types                                                             |
| Environments              | Unlimited        | Named envs in config                                                               |
| Config file size          | ~1MB             | Keep reasonable                                                                    |
| Workers Assets size       | 25 MiB           | Per **asset file**; wrangler rejects the deploy before upload                      |
| Workers Assets file count | 20,000 / 100,000 | Per Worker version: Free / Paid + Workers for Platforms (needs wrangler >= 4.34.0) |
| Script size (compressed)  | 1 MB             | Free, 10 MB paid                                                                   |
| CPU time                  | 10-50ms          | Free, 50-500ms paid                                                                |
| Subrequest limit          | 50               | Free, 1000 paid                                                                    |

## Troubleshooting

### Authentication Issues

```bash
wrangler logout
wrangler login
wrangler whoami
```

### Configuration Errors

```bash
wrangler deploy --dry-run  # Build, validate config, and run pre-upload checks without upload
```

Use wrangler.jsonc with `$schema` for validation.

### Binding Not Available

- Check binding exists in config
- For environments, ensure binding defined for that env
- Local dev: some bindings need `--remote`

### Deployment Failures

```bash
wrangler tail              # Check logs
wrangler deploy --dry-run  # Validate
wrangler whoami            # Check account limits
```

### Local Development Issues

```bash
wrangler dev --persist-to ./local-state  # Use an isolated state directory when diagnosing state
wrangler dev --remote      # Use remote bindings
wrangler dev --persist-to ./local-state  # Custom persist location
wrangler dev --inspector-port 9229  # Enable debugging
```

### Testing Issues

```bash
# If tests hang, ensure close() is awaited
await harness.close();

# If bindings don't work in tests
const harness = createTestHarness({
  workers: [{ configPath: "./wrangler.jsonc" }],
});
```

## Resources

- Docs: https://developers.cloudflare.com/workers/wrangler/
- Config: https://developers.cloudflare.com/workers/wrangler/configuration/
- Commands: https://developers.cloudflare.com/workers/wrangler/commands/
- Examples: https://github.com/cloudflare/workers-sdk/tree/main/templates
- Discord: https://discord.gg/cloudflaredev

## See Also

- [README.md](./README.md) - Commands
- [configuration.md](./configuration.md) - Config
- [api.md](./api.md) - Programmatic API
- [patterns.md](./patterns.md) - Workflows
