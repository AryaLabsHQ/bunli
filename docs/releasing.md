# Releasing bunli

This repo uses Changesets for versioning and changelogs.

## Manual changesets

Create a changeset when your change needs a release:

```bash
bun run changeset
```

This adds a markdown file in `.changeset/` describing which packages should be bumped and why.

If a change should not trigger a release (docs, CI, internal tooling), you can add an empty changeset:

```bash
bunx changeset --empty
```

## Release preparation (autoship-like)

Generate changesets automatically from commit history:

```bash
bun run release:prepare
```

Useful flags:

- `--package <name>`: prepare a changeset for one package
- `--all`: consider all publishable packages
- `--since <tag|commit>`: override the commit range
- `--dry-run`: show what would be created without writing files
- `--pr`: open a PR with the changeset(s) via `gh`
- `--ai`: generate changeset summaries with AI (optional, requires `AI_GATEWAY_API_KEY`)

## CI-managed releases

The repo uses `changesets/action` to keep a Version Packages PR up to date.
When the Version Packages PR is merged, CI will publish packages to npm.

### Workspace protocol note

Inside the monorepo, packages depend on each other via `workspace:*`.
Before publishing to npm, we rewrite those ranges to real semver ranges so consumers can install
with npm or Bun. This happens automatically in CI as part of `release:publish`.

### Required GitHub secrets

- `NPM_TOKEN`: used by the publish step to publish to npm.

### Required GitHub repo setting

Enable GitHub Actions to create pull requests:

1. Go to GitHub repo Settings
2. Actions > General
3. Under "Workflow permissions", enable "Allow GitHub Actions to create and approve pull requests"

Without this, `changesets/action` will fail when trying to open the "Version Packages" PR.

### Binaries automation

The binaries GitHub Release workflow is triggered via `workflow_dispatch` (not tag-push), and
is dispatched automatically by the Changesets workflow when the `bunli` package is published.
This is intentionally done so we can rely on `secrets.GITHUB_TOKEN` and avoid a PAT.

The dispatch passes both:

- `tag`: the published `bunli@x.y.z` tag name
- `ref`: the commit SHA that was published

This is intentional, because tags created during publish might not exist on the remote yet.

## Changeset reminders

We recommend installing the changeset-bot GitHub app to remind contributors to add changesets.
This is non-blocking and does not fail CI.
