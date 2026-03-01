# @bunli/tui

**Terminal UI components for Bunli using OpenTUI.**

## OVERVIEW

Provides OpenTUI integration for building rich terminal UIs.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main exports | `src/index.ts` |
| Renderer registration | `src/register.ts` |
| Components | `src/components/` |

## PATTERNS

```typescript
import { registerTuiRenderer } from '@bunli/tui'

registerTuiRenderer()
```

Or use side-effect registration:

```typescript
import '@bunli/tui/register'
```

## EXPORTS

### Hooks (from @opentui/react)
- `useKeyboard`, `useRenderer`, `useTerminalDimensions`, `useTimeline`, `useOnResize`

### Types
- `PromptApi`, `SyncBatcher`, `SyncBatcherOptions`
- `SelectOption`, `KeyEvent`, `CliRendererConfig` (from `@opentui/core`)

### Styling (from @opentui/core)
- `bold`, `fg`, `italic`, `t`, `TextAttributes`
