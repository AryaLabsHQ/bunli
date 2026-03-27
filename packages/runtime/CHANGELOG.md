# @bunli/runtime

## 0.3.0

### Minor Changes

- 586d586: Add shell-scriptable `bunli shell` commands and a new set of terminal prompt components and utilities, including the follow-up fixes for command wiring, formatting, confirm behavior, and shell utility packaging.

## 0.2.0

### Minor Changes

- cd1d24d: add terminal image preview support via Kitty protocol with --image-mode flag and configurable options.

## 0.1.1

### Patch Changes

- 5931e6e: rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.

## 0.1.0

### Minor Changes

- f1c404a: introducing `@bunli/tui` component-library

  - move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
  - drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
  - add schema-driven interactive form engine and expanded themed interactive component primitives
  - add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)
