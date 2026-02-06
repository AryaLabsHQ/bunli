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

### Required GitHub secrets

- `NPM_TOKEN`: used by the publish step to publish to npm.
- `RELEASE_GITHUB_TOKEN` (recommended): a GitHub PAT used by `changesets/action` to push tags.
  This matters because the binary release workflow is triggered by `bunli@*` tags, and GitHub
  does not trigger workflows from tag pushes created using `secrets.GITHUB_TOKEN`.

## Changeset reminders

We recommend installing the changeset-bot GitHub app to remind contributors to add changesets.
This is non-blocking and does not fail CI.
