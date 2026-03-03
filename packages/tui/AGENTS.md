# @bunli/tui

**Terminal UI components for Bunli using OpenTUI.**

## OVERVIEW

Provides OpenTUI React components and UI primitives for Bunli.
Runtime prompt/renderer wiring lives in `@bunli/runtime`.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main exports | `src/index.ts` |
| Components | `src/components/` |

## PATTERNS

Use `@bunli/runtime` for prompt/spinner and render runtime APIs.
`@bunli/tui` should stay focused on components/hooks/theming.

## EXPORTS

### Hooks (from @opentui/react)
- `useKeyboard`, `useRenderer`, `useTerminalDimensions`, `useTimeline`, `useOnResize`

### Types
- `SyncBatcher`, `SyncBatcherOptions`
- `SelectOption`, `KeyEvent`, `CliRendererConfig` (from `@opentui/core`)

### Styling (from @opentui/core)
- `bold`, `fg`, `italic`, `t`, `TextAttributes`
