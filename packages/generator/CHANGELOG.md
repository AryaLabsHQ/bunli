# @bunli/generator

## 0.6.3

### Patch Changes

- 8f0ba97: fix nested group subcommand completions, shared option metadata extraction, and strict nested `doctor completions` checks.

## 0.6.2

### Patch Changes

- 88cfc08: feat!: simplify command/group authoring and codegen discovery

  - Introduce a clearer command group model and align manual registration around default-exported command/group modules.
  - Improve generator/scanner discovery for registered identifiers, alias chains, nested references, and circular detection.
  - Fix completion/codegen edge cases including non-code import traversal and multi-entry build handling.

- Updated dependencies [88cfc08]
  - @bunli/core@0.7.0

## 0.6.1

### Patch Changes

- b481746: chore(deps): use workspace:^ for internal package references instead of workspace:\*
- Updated dependencies [98fccfb]
- Updated dependencies [b481746]
  - @bunli/core@0.6.1

## 0.6.0

### Minor Changes

- 8eff145: Adopt `better-result` for typed error handling with `Result` and `TaggedError`.

  Also split config input/output types and fix CLI cancellation, `execute(commandName, options)`, and generator behavior when `commands/` is missing.

### Patch Changes

- Updated dependencies [8eff145]
  - @bunli/core@0.6.0

## 0.5.5

### Patch Changes

- @bunli/core@0.5.7

## 0.5.4

### Patch Changes

- Updated dependencies [454d869]
  - @bunli/core@0.5.6

## 0.5.3

### Patch Changes

- 5186a7d: feat: add binary release support for npm package publishing

  - Add release.binary config for per-platform npm packages
  - Generate ESM shim that dispatches to correct platform binary
  - Improve boolean flag handling (--flag=false form)
  - Add unit and E2E tests for release command

- Updated dependencies [5186a7d]
  - @bunli/core@0.5.5

## 0.5.2

### Patch Changes

- 5e3a702: chore: bump all packages (patch) to validate the Changesets + bun publish release pipeline end-to-end.
- Updated dependencies [5e3a702]
  - @bunli/core@0.5.4

## 0.5.1

### Patch Changes

- 2da146a: Patch bump all publishable packages to validate the full Changesets-driven release pipeline:
  npm publish, version PR flow, and the dispatched `bunli@*` GitHub binary release.
- Updated dependencies [2da146a]
  - @bunli/core@0.5.3
