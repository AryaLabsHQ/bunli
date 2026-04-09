# @bunli/core

## 0.9.0

### Minor Changes

- 44bb5d0: Add follow-up fixes for config loading, repeatable flags, and machine-readable CLI output.
  - Let a complete inline `createCLI()` override win even when the on-disk Bunli config fails to load, while preserving `ConfigNotFoundError` and `ConfigLoadError` behavior for incomplete overrides.
  - Add `repeatable: true` option metadata in `@bunli/core` so repeated flags can accumulate into validated arrays.
  - Finish normalizing machine-readable core output by formatting built-in help, version, manifest, unknown-command, and validation error paths through the shared output system.
  - Export `serializeCliError()` from `@bunli/core/output` and `@bunli/core` for structured error serialization.
  - Update `@bunli/test` coverage for machine-readable output flows and align test command runtime metadata with the new output format handling.

- aa971b5: Add a new agent-oriented framework layer across Bunli.
  - Add multi-format output support to `@bunli/core` with `--format`, handler `output()` helpers, agent-aware defaults, `--llms` / `--llms-full` manifests, richer command errors, help rendering extraction, recursive manifest generation, alias-safe manifest output, plugin `preRun` / `postRun` hooks, and XDG-aware plugin paths.
  - Add XDG directory helpers to `@bunli/utils`.
  - Add `createTestCLI`, type-level inference tests, and direct stdout/stderr capture support to `@bunli/test`.
  - Add post-create step orchestration to `create-bunli` for install, git init, editor open, and arbitrary command steps.
  - Vendor the completions engine into `@bunli/plugin-completions`, removing the external `@bomb.sh/tab` dependency.
  - Add `@bunli/plugin-skills` for generating and syncing `SKILL.md` files for detected agents, including force mode, target-scoped staleness checks, and global installs for agent-specific skill directories.
  - Add `@bunli/store` as a typed file-backed JSON persistence package with atomic replace writes and validation hooks.

### Patch Changes

- Updated dependencies [aa971b5]
- Updated dependencies [586d586]
  - @bunli/utils@0.6.0
  - @bunli/runtime@0.3.0

## 0.8.2

### Patch Changes

- cd1d24d: add terminal image preview support via Kitty protocol with --image-mode flag and configurable options.
- Updated dependencies [cd1d24d]
  - @bunli/runtime@0.2.0

## 0.8.1

### Patch Changes

- 5931e6e: rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.
- Updated dependencies [5931e6e]
  - @bunli/runtime@0.1.1
  - @bunli/utils@0.5.1

## 0.8.0

### Minor Changes

- f1c404a: introducing `@bunli/tui` component-library
  - move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
  - drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
  - add schema-driven interactive form engine and expanded themed interactive component primitives
  - add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)

### Patch Changes

- Updated dependencies [f1c404a]
  - @bunli/runtime@0.1.0
  - @bunli/utils@0.5.0

## 0.7.0

### Minor Changes

- 88cfc08: feat!: simplify command/group authoring and codegen discovery
  - Introduce a clearer command group model and align manual registration around default-exported command/group modules.
  - Improve generator/scanner discovery for registered identifiers, alias chains, nested references, and circular detection.
  - Fix completion/codegen edge cases including non-code import traversal and multi-entry build handling.

## 0.6.1

### Patch Changes

- 98fccfb: fix(core): prefer factory overload in createPlugin to keep plugin factories callable and avoid BunliPlugin mis-inference
- b481746: chore(deps): use workspace:^ for internal package references instead of workspace:\*

## 0.6.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

### Patch Changes

- Updated dependencies [8eff145]
  - @bunli/utils@0.4.0

## 0.5.7

### Patch Changes

- Updated dependencies [ff041df]
  - @bunli/utils@0.3.3

## 0.5.6

### Patch Changes

- 454d869: Fix prompt-cancel handling in CLI execution by statically importing `PromptCancelledError` from `@bunli/utils` instead of dynamically importing it in catch blocks.

  This prevents `TypeError: Right hand side of instanceof is not an object` during cancellation paths (including release prompts) and keeps cancellations exiting cleanly with code `0`.

## 0.5.5

### Patch Changes

- 5186a7d: feat: add binary release support for npm package publishing
  - Add release.binary config for per-platform npm packages
  - Generate ESM shim that dispatches to correct platform binary
  - Improve boolean flag handling (--flag=false form)
  - Add unit and E2E tests for release command

## 0.5.4

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.
- Updated dependencies [5e3a702]
  - @bunli/utils@0.3.2

## 0.5.3

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
- Updated dependencies [2da146a]
  - @bunli/utils@0.3.1
