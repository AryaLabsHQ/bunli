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
- `--yes, -y`: skip confirmation prompts
- `--ai`: try AI-generated changeset summaries using `AI_GATEWAY_API_KEY`, with a deterministic fallback

`--yes` skips interactive confirmations. A dirty working tree proceeds with a warning instead of prompting; when neither `--package` nor `--all` is set, all modified packages are selected without the multiselect; and `--pr` opens the PR without asking. Without `--yes`, a dirty tree prompts "Working tree is not clean. Continue anyway?" and defaults to no. `--dry-run` skips the dirty-tree check and does not write changesets or open a PR.

`--ai` is best-effort. If `AI_GATEWAY_API_KEY` is unset, or the AI request fails, the script logs a warning and uses a deterministic summary containing package names and up to three unique commit messages. Normal changeset creation continues; `--dry-run` only previews the result.

## CI-managed releases

The repo uses `changesets/action` to keep a Version Packages PR up to date.
When the Version Packages PR is merged, CI will publish packages to npm.

Publishing uses `bun publish` (not `npm publish`) so workspace dependencies like `workspace:*`
are correctly resolved into real semver ranges in the published tarballs.

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
