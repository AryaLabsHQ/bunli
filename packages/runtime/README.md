# @bunli/runtime

Runtime renderer and prompt primitives for Bunli.

## Installation

```bash
bun add @bunli/runtime react
```

## Exports

Use subpath imports:
- `@bunli/runtime/renderer` - render runner
- `@bunli/runtime/app` - runtime providers/hooks plus shared app-facing UI runtime utilities
- `@bunli/runtime/prompt` - prompt/session/spinner APIs
- `@bunli/runtime/options` - renderer option resolution
- `@bunli/runtime/events` - zod runtime event contracts
- `@bunli/runtime/transport` - runtime transport interfaces
- `@bunli/runtime/image` - terminal image capability + render helpers

The root `@bunli/runtime` export is intentionally minimal and non-authoritative.

## License

MIT
