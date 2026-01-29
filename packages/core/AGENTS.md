# @bunli/core

**Type-safe CLI framework core with plugin system.**

## OVERVIEW

Core package providing `defineCommand`, `option()`, and `createPlugin<T>()` for building type-safe CLI tools.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Command definition | `src/command/define-command.ts` |
| Option schemas | `src/option/` |
| Plugin factory | `src/plugin/index.ts` |
| Plugin types | `src/plugin/types.ts` |
| Handler context | `src/context.ts` |

## CONVENTIONS

- Plugin store must be typed via generics: `createPlugin<StoreType>()`
- Use context-bound store access, never global
- Export types explicitly for tree-shaking
- Never modify store directly - use setter methods

## ANTI-PATTERNS

- `Object.freeze()` in plugin stores - breaks Zod validation
- `as any` to bypass type checks
- Missing `as const` on plugin array
