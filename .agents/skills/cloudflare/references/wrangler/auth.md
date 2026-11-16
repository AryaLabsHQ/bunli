# Authentication

Authenticate with Cloudflare before deploying Workers or Pages.

## Quick Decision Tree

```
Need to authenticate?
├─ Interactive/local dev → wrangler login (recommended)
│  └─ Prefer OS-backed storage → wrangler login --use-keyring (Wrangler >=4.107)
├─ CI/CD or headless → CLOUDFLARE_API_TOKEN env var
├─ Multiple local identities → wrangler auth create/activate (experimental, Wrangler >=4.106)
└─ Terraform/Pulumi → See respective references
```

## wrangler login (Recommended)

One-time OAuth flow for local development:

```bash
npx wrangler login  # Opens browser, completes OAuth
npx wrangler whoami # Verify identity, accounts, and scopes
```

Wrangler stores OAuth credentials locally. From `4.107`, opt into operating-system keyring storage:

```bash
npx wrangler login --use-keyring
npx wrangler auth keyring enable
npx wrangler auth keyring disable
```

`CLOUDFLARE_AUTH_USE_KEYRING=false` disables keyring use for a command. Do not run keyring migration
commands in CI.

## Experimental Auth Profiles (Wrangler >=4.106)

Profiles keep multiple OAuth identities and select one per command:

```bash
npx wrangler auth list
npx wrangler auth create work
npx wrangler auth activate work
npx wrangler --profile work whoami
```

The profile command group is experimental. Pin Wrangler before scripting it. Environment credentials
such as `CLOUDFLARE_API_TOKEN` take precedence over stored OAuth credentials;
`CLOUDFLARE_ACCOUNT_ID` can still choose an account for non-interactive commands.

## API Token (CI/CD)

For automated pipelines or environments without browser access:

1. Go to: **https://dash.cloudflare.com/profile/api-tokens**
2. Click **Create Token**
3. Select the least-privilege permissions required by the exact Wrangler command and resource
4. Copy the token (shown only once)
5. Set environment variable:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
```

### Minimal Permissions by Task

Do not assume one Workers token automatically grants access to Pages, KV, D1, R2, AI Search, or
other account products. Scope the token to the target account and required resources, then verify it
with `wrangler whoami` and a read-only command before using a mutating command.

## Troubleshooting

| Error                         | Cause                         | Fix                                                            |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------- |
| "Not logged in"               | No credentials                | `wrangler login` or set `CLOUDFLARE_API_TOKEN`                 |
| "Authentication error"        | Invalid/expired token         | Regenerate token in dashboard                                  |
| "Missing account"             | Wrong account selected        | `wrangler whoami` to check, add `account_id` to wrangler.jsonc |
| Token works locally, fails CI | Token scoped to wrong account | Verify account ID matches in both places                       |
| "Insufficient permissions"    | Token lacks required scope    | Create new token with correct permissions                      |

## Verifying Authentication

```bash
npx wrangler whoami
```

Output shows:

- Email (if OAuth login)
- Account ID and name
- Token scopes (if API token)

Non-zero exit code means not authenticated.

## See Also

**Retrieve**: Terraform provider auth at `/terraform/`, Pulumi provider auth at `/pulumi/`. Both
providers authenticate with the same `CLOUDFLARE_API_TOKEN` this file describes.
