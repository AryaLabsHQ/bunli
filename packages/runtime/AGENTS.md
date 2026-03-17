# @bunli/runtime

**Runtime renderer and prompt primitives for Bunli.**

## OVERVIEW

Contains terminal runtime wiring extracted from `@bunli/tui`.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main exports | `src/index.ts` |
| Renderer runtime | `src/renderer.tsx` |
| Prompt runtime | `src/prompt/` |
| Renderer options | `src/options.ts` |
| Event contracts | `src/events.ts` |
| Transport types | `src/transport.ts` |

## PATTERNS

- Keep imports ESM with `.js` extension for local modules.
- Prefer explicit subpath imports (`renderer`, `prompt`, `options`, `events`, `transport`).
- Keep event schemas in `src/events.ts` as zod contracts.
