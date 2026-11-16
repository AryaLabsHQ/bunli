# Wrangler version deltas

The skill documents Wrangler `4.108.0`. Read this file when the target repository runs an older
Wrangler or a task depends on a feature that arrived recently. Harness capability gates by version
are in [api.md](api.md#version-gates).

## Wrangler 4.104-4.108 delta

| Version | Relevant change                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.104   | `createTestHarness().getWorker().getEnv()` exposes vars, local secrets, and bindings.                                                                                                 |
| 4.105   | No general Workers testing or config migration required. Release focus was container registry support and fixes.                                                                      |
| 4.106   | Harness adds D1 migrations, Workflow introspection, binding overrides, and `getExport()`. AI Search adds indexing-job commands and R2 jurisdiction. Auth profiles arrive.             |
| 4.107   | Declarative Durable Object `exports` arrives. OAuth keyring storage is opt-in. `unstable_startWorker` remains explicitly unstable.                                                    |
| 4.108   | Agent-driven brand-new static Pages deploy or project creation may delegate to Workers static assets. Existing Pages accounts, projects, and Pages-specific features remain on Pages. |

`createTestHarness` exists from Wrangler `4.99`. Read the target repository's installed version
before copying harness or declarative-export examples. Use APIs supported by that version. If the
requested behavior requires an upgrade, explain the dependency and keep the upgrade within the
authorized scope. Do not add compatibility shims.
