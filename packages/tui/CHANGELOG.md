# @bunli/tui

## 0.5.2

### Patch Changes

- Updated dependencies [cd1d24d]
  - @bunli/runtime@0.2.0

## 0.5.1

### Patch Changes

- 5931e6e: rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.
- Updated dependencies [5931e6e]
  - @bunli/runtime@0.1.1

## 0.5.0

### Minor Changes

- f1c404a: introducing `@bunli/tui` component-library

  - move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
  - drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
  - add schema-driven interactive form engine and expanded themed interactive component primitives
  - add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)

### Patch Changes

- Updated dependencies [f1c404a]
  - @bunli/runtime@0.1.0

## 0.4.2

### Patch Changes

- Updated dependencies [88cfc08]
  - @bunli/core@0.7.0

## 0.4.1

### Patch Changes

- b481746: chore(deps): use workspace:^ for internal package references instead of workspace:\*
- Updated dependencies [98fccfb]
- Updated dependencies [b481746]
  - @bunli/core@0.6.1

## 0.4.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

### Patch Changes

- Updated dependencies [8eff145]
  - @bunli/core@0.6.0

## 0.3.5

### Patch Changes

- @bunli/core@0.5.7

## 0.3.4

### Patch Changes

- Updated dependencies [454d869]
  - @bunli/core@0.5.6

## 0.3.3

### Patch Changes

- Updated dependencies [5186a7d]
  - @bunli/core@0.5.5

## 0.3.2

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.
- Updated dependencies [5e3a702]
  - @bunli/core@0.5.4

## 0.3.1

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
- Updated dependencies [2da146a]
  - @bunli/core@0.5.3
