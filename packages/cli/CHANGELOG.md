# bunli

## 0.9.1

### Patch Changes

- 02a7a1e: fix(cli): preserve positionals after boolean flags, improve installed-project errors, and republish create-bunli so scaffolding users pick up the latest fixes
- Updated dependencies [02a7a1e]
  - @bunli/core@0.9.1

## 0.9.0

### Minor Changes

- 586d586: Add shell-scriptable `bunli shell` commands and a new set of terminal prompt components and utilities, including the follow-up fixes for command wiring, formatting, confirm behavior, and shell utility packaging.

### Patch Changes

- Updated dependencies [44bb5d0]
- Updated dependencies [aa971b5]
- Updated dependencies [586d586]
  - @bunli/core@0.9.0
  - @bunli/utils@0.6.0
  - @bunli/plugin-completions@0.3.5
  - @bunli/tui@0.6.0
  - @bunli/generator@0.6.5

## 0.8.2

### Patch Changes

- 14f51cf: feat(release): add resumable release support with checkpoint persistence

## 0.8.1

### Patch Changes

- 5931e6e: rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.
- Updated dependencies [5931e6e]
  - @bunli/utils@0.5.1
  - @bunli/core@0.8.1

## 0.8.0

### Minor Changes

- f1c404a: introducing `@bunli/tui` component-library
  - move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
  - drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
  - add schema-driven interactive form engine and expanded themed interactive component primitives
  - add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)

### Patch Changes

- Updated dependencies [f1c404a]
  - @bunli/utils@0.5.0
  - @bunli/core@0.8.0
  - @bunli/generator@0.6.4
  - @bunli/plugin-completions@0.3.4

## 0.7.1

### Patch Changes

- 8f0ba97: fix nested group subcommand completions, shared option metadata extraction, and strict nested `doctor completions` checks.
- Updated dependencies [8f0ba97]
  - @bunli/plugin-completions@0.3.3
  - @bunli/generator@0.6.3

## 0.7.0

### Minor Changes

- 88cfc08: feat!: simplify command/group authoring and codegen discovery
  - Introduce a clearer command group model and align manual registration around default-exported command/group modules.
  - Improve generator/scanner discovery for registered identifiers, alias chains, nested references, and circular detection.
  - Fix completion/codegen edge cases including non-code import traversal and multi-entry build handling.

### Patch Changes

- Updated dependencies [88cfc08]
  - @bunli/core@0.7.0
  - @bunli/generator@0.6.2
  - @bunli/plugin-completions@0.3.2

## 0.6.1

### Patch Changes

- b481746: chore(deps): use workspace:^ for internal package references instead of workspace:\*
- Updated dependencies [98fccfb]
- Updated dependencies [b481746]
  - @bunli/core@0.6.1
  - @bunli/generator@0.6.1

## 0.6.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

### Patch Changes

- Updated dependencies [8eff145]
  - @bunli/generator@0.6.0
  - @bunli/utils@0.4.0
  - @bunli/core@0.6.0

## 0.5.6

### Patch Changes

- Updated dependencies [ff041df]
  - @bunli/utils@0.3.3
  - @bunli/core@0.5.7
  - @bunli/generator@0.5.5

## 0.5.5

### Patch Changes

- Updated dependencies [454d869]
  - @bunli/core@0.5.6
  - @bunli/generator@0.5.4

## 0.5.4

### Patch Changes

- 5186a7d: feat: add binary release support for npm package publishing

  - Add release.binary config for per-platform npm packages
  - Generate ESM shim that dispatches to correct platform binary
  - Improve boolean flag handling (--flag=false form)
  - Add unit and E2E tests for release command

- Updated dependencies [5186a7d]
  - @bunli/core@0.5.5
  - @bunli/generator@0.5.3

## 0.5.3

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.
- Updated dependencies [5e3a702]
  - @bunli/core@0.5.4
  - @bunli/generator@0.5.2
  - @bunli/utils@0.3.2

## 0.5.2

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
- Updated dependencies [2da146a]
  - @bunli/core@0.5.3
  - @bunli/generator@0.5.1
  - @bunli/utils@0.3.1
