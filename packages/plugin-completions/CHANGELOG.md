# @bunli/plugin-completions

## 0.3.5

### Patch Changes

- aa971b5: Add a new agent-oriented framework layer across Bunli.

  - Add multi-format output support to `@bunli/core` with `--format`, handler `output()` helpers, agent-aware defaults, `--llms` / `--llms-full` manifests, richer command errors, help rendering extraction, recursive manifest generation, alias-safe manifest output, plugin `preRun` / `postRun` hooks, and XDG-aware plugin paths.
  - Add XDG directory helpers to `@bunli/utils`.
  - Add `createTestCLI`, type-level inference tests, and direct stdout/stderr capture support to `@bunli/test`.
  - Add post-create step orchestration to `create-bunli` for install, git init, editor open, and arbitrary command steps.
  - Vendor the completions engine into `@bunli/plugin-completions`, removing the external `@bomb.sh/tab` dependency.
  - Add `@bunli/plugin-skills` for generating and syncing `SKILL.md` files for detected agents, including force mode, target-scoped staleness checks, and global installs for agent-specific skill directories.
  - Add `@bunli/store` as a typed file-backed JSON persistence package with atomic replace writes and validation hooks.

- Updated dependencies [44bb5d0]
- Updated dependencies [aa971b5]
  - @bunli/core@0.9.0

## 0.3.4

### Patch Changes

- Updated dependencies [f1c404a]
  - @bunli/core@0.8.0

## 0.3.3

### Patch Changes

- 8f0ba97: fix nested group subcommand completions, shared option metadata extraction, and strict nested `doctor completions` checks.

## 0.3.2

### Patch Changes

- Updated dependencies [88cfc08]
  - @bunli/core@0.7.0

## 0.3.1

### Patch Changes

- b481746: chore(deps): use workspace:^ for internal package references instead of workspace:\*
- Updated dependencies [98fccfb]
- Updated dependencies [b481746]
  - @bunli/core@0.6.1

## 0.3.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

### Patch Changes

- Updated dependencies [8eff145]
  - @bunli/core@0.6.0

## 0.2.5

### Patch Changes

- @bunli/core@0.5.7

## 0.2.4

### Patch Changes

- Updated dependencies [454d869]
  - @bunli/core@0.5.6

## 0.2.3

### Patch Changes

- Updated dependencies [5186a7d]
  - @bunli/core@0.5.5

## 0.2.2

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.
- Updated dependencies [5e3a702]
  - @bunli/core@0.5.4
  - @bunli/generator@0.5.2

## 0.2.1

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
- Updated dependencies [2da146a]
  - @bunli/core@0.5.3
  - @bunli/generator@0.5.1
