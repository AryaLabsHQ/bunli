import { $ } from 'bun'

/**
 * CI helper used by `changesets/action` for the "Version Packages" PR.
 *
 * Changesets bumps package.json versions, but Bun needs an updated bun.lockb so that
 * `bun publish` can correctly resolve workspace dependencies at publish time.
 */
async function main() {
  // Ensure Changesets runs non-interactively in CI.
  await $`CI=1 bunx changeset version`

  // Intentionally allow lockfile changes here; the Version Packages PR should include bun.lockb updates.
  await $`bun install`
}

await main()
