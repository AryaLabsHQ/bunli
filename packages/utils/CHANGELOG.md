# @bunli/utils

## 0.6.0

### Minor Changes

- aa971b5: Add a new agent-oriented framework layer across Bunli.
  - Add multi-format output support to `@bunli/core` with `--format`, handler `output()` helpers, agent-aware defaults, `--llms` / `--llms-full` manifests, richer command errors, help rendering extraction, recursive manifest generation, alias-safe manifest output, plugin `preRun` / `postRun` hooks, and XDG-aware plugin paths.
  - Add XDG directory helpers to `@bunli/utils`.
  - Add `createTestCLI`, type-level inference tests, and direct stdout/stderr capture support to `@bunli/test`.
  - Add post-create step orchestration to `create-bunli` for install, git init, editor open, and arbitrary command steps.
  - Vendor the completions engine into `@bunli/plugin-completions`, removing the external `@bomb.sh/tab` dependency.
  - Add `@bunli/plugin-skills` for generating and syncing `SKILL.md` files for detected agents, including force mode, target-scoped staleness checks, and global installs for agent-specific skill directories.
  - Add `@bunli/store` as a typed file-backed JSON persistence package with atomic replace writes and validation hooks.

- 586d586: Add shell-scriptable `bunli shell` commands and a new set of terminal prompt components and utilities, including the follow-up fixes for command wiring, formatting, confirm behavior, and shell utility packaging.

## 0.5.1

### Patch Changes

- 5931e6e: rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.

## 0.5.0

### Minor Changes

- f1c404a: introducing `@bunli/tui` component-library
  - move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
  - drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
  - add schema-driven interactive form engine and expanded themed interactive component primitives
  - add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)

## 0.4.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

## 0.3.3

### Patch Changes

- ff041df: fix(utils): prompts

## 0.3.2

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.

## 0.3.1

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
