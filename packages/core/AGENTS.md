# @bunli/core

**Type-safe CLI framework core with plugin system.**

## OVERVIEW

Core package providing `defineCommand`, `option()`, and `createPlugin<T>()` for building type-safe CLI tools.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Command definition | `src/types.ts` |
| Option schemas | `src/types.ts` |
| Plugin factory | `src/plugin/index.ts` |
| Plugin types | `src/plugin/types.ts` |
| Handler context | `src/plugin/context.ts` |
| Error classes | `src/plugin/errors.ts` |

## CONVENTIONS

- Plugin store must be typed via generics: `createPlugin<StoreType>()`
- Use context-bound store access, never global
- Export types explicitly for tree-shaking
- Prefer direct store property access (`context.store.foo = bar`) over accessor methods — `store` is typed as `TStore` so TypeScript enforces correctness

## ERROR HANDLING

Use `better-result` TaggedError pattern:

```typescript
import { TaggedError } from 'better-result'

export class MyError extends TaggedError('MyError')<{
  message: string
  cause?: unknown
}>() {}
```

Error classes in `src/plugin/errors.ts`:
- `PluginLoadError` - Failed to load plugin
- `PluginValidationError` - Plugin validation failed
- `PluginHookError` - Plugin hook execution failed

## ANTI-PATTERNS

- `Object.freeze()` in plugin stores - breaks Zod validation
- `as any` to bypass type checks
- Missing `as const` on plugin array
