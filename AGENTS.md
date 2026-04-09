# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-27
**Commit:** ab23dd0

## OVERVIEW

Minimal, type-safe CLI framework for Bun with advanced plugin system. Uses Zod for command validation, Bun Shell for execution, Turborepo for builds, and better-result for error handling.

## STRUCTURE

```
./
├── packages/           # 14 core packages
│   ├── core/           # CLI framework (defineCommand, plugins)
│   ├── cli/            # bunli CLI toolchain
│   ├── utils/          # colors, prompts, spinners
│   ├── test/           # CLI testing utilities
│   ├── generator/      # TypeScript type generation
│   ├── create-bunli/   # Project scaffolding
│   ├── plugin-ai-detect/
│   ├── plugin-completions/
│   ├── plugin-config/
│   ├── plugin-mcp/
│   ├── plugin-skills/
│   ├── runtime/        # OpenTUI runtime (prompt/renderer/events/transport)
│   ├── store/            # Persistent typed store
│   └── tui/
├── examples/           # 4 working examples
├── apps/web/           # TanStack Start + Cloudflare Workers docs site
└── scripts/            # Build/release automation
```

## WHERE TO LOOK

| Task            | Location                     | Notes                                |
| --------------- | ---------------------------- | ------------------------------------ |
| Add command     | `packages/cli/src/commands/` | Use `defineCommand` pattern          |
| Plugin system   | `packages/core/src/plugin/`  | `createPlugin<T>()` with typed store |
| Type generation | `packages/generator/src/`    | Creates `commands.gen.ts`            |
| Utilities       | `packages/utils/src/`        | colors, validation                   |
| Runtime         | `packages/runtime/src/`      | OpenTUI prompt/renderer runtime      |
| Tests           | `packages/*/test/*.test.ts`  | Bun test runner                      |

## CODE MAP

| Symbol          | Location                     | Purpose             |
| --------------- | ---------------------------- | ------------------- |
| `defineCommand` | `packages/core/src/types.ts` | Command builder     |
| `option()`      | `packages/core/src/types.ts` | Flag definition     |
| `createPlugin`  | `packages/core/src/plugin/`  | Plugin factory      |
| `createCLI`     | `packages/core/src/cli.ts`   | CLI entry point     |
| `TaggedError`   | `better-result`              | Error class pattern |

## CONVENTIONS

- **ESM imports**: Always use `.js` extension for local imports
- **Named exports**: Avoid default exports for tree-shaking
- **File naming**: kebab-case (`my-command.ts`)
- **Zod validation**: All command options use Zod schemas
- **Plugin store**: Typed via generics, prefer direct property access (`context.store.foo`) over accessor methods
- **Test files**: `.test.ts` suffix in `packages/*/test/`
- **Error handling**: Use `better-result` with `TaggedError` pattern
- **Import ordering**: External packages → `@bunli/*` → relative imports → type-only imports

## TOOLING

- **Always use Bun** — never Node.js, npm, pnpm, yarn, webpack, or jest. Vite is used for the web app build. Vitest is allowed only for type-level tests (\*.test-d.ts)
- Prefer `Bun.file` over `node:fs` readFile/writeFile
- Prefer `Bun.$` (shell) over `execa` or `child_process`
- Bun auto-loads `.env` — don't use `dotenv`

## ANTI-PATTERNS (THIS PROJECT)

- `as any` / `@ts-ignore` - Never suppress type errors
- `Object.freeze()` in plugin stores - Breaks Zod validation
- Global store access - Always use context-bound store
- Missing `.js` extension on local imports

## COMMANDS

```bash
# Install dependencies
bun install

# Development (watch mode)
bun run dev

# Run all tests
bun test

# Build all packages
bun run build

# Clean artifacts
bun run clean

# Release packages
bun run release
```

## AGENTS.md LOCATIONS

| Directory                      | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `packages/core/`               | CLI framework patterns                        |
| `packages/cli/`                | bunli CLI commands                            |
| `packages/utils/`              | Utility patterns                              |
| `packages/plugin-ai-detect/`   | AI detection plugin                           |
| `packages/plugin-config/`      | Config merging plugin                         |
| `packages/plugin-completions/` | Shell completions                             |
| `packages/plugin-mcp/`         | MCP tool→command conversion                   |
| `packages/plugin-skills/`      | AI agent skill sync                           |
| `packages/store/`              | Persistent typed store                        |
| `packages/generator/`          | Type generation                               |
| `packages/test/`               | Testing utilities                             |
| `packages/runtime/`            | OpenTUI runtime patterns                      |
| `packages/tui/`                | TUI components                                |
| `packages/create-bunli/`       | Scaffolding patterns                          |
| `examples/*/`                  | Example-specific patterns                     |
| `apps/web/`                    | TanStack Start + Cloudflare Workers docs site |
