# @bunli/core

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
