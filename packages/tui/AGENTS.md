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

plugins: [registerTuiRenderer()]
```

## EXPORTS

### Hooks (from @opentui/react)
- `useKeyboard`, `useRenderer`, `useTerminalDimensions`

### Styling (from @opentui/core)
- `bold`, `fg`, `italic`, `t`
