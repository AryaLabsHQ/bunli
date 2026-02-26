# @bunli/utils

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
