# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-29
**Type:** Bun monorepo (workspace + Turbo)

## OVERVIEW

Minimal, type-safe CLI framework for Bun with advanced plugin system. Uses Zod for command validation, Bun Shell for execution, and Turborepo for builds.

## STRUCTURE

```
./
├── packages/           # 11 core packages
│   ├── core/           # CLI framework (defineCommand, plugins)
│   ├── cli/            # bunli CLI toolchain
│   ├── utils/          # colors, prompts, spinners
│   ├── test/           # CLI testing utilities
│   ├── generator/      # TypeScript type generation
│   ├── create-bunli/   # Project scaffolding
│   ├── plugin-*/       # ai-detect, config, completions
│   └── tui/            # Terminal UI components
├── examples/           # 4 working examples
├── apps/web/           # Next.js docs site
└── scripts/            # Build/release automation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add command | `packages/cli/src/commands/` | Use `defineCommand` pattern |
| Plugin system | `packages/core/src/plugin/` | `createPlugin<T>()` with typed store |
| Type generation | `packages/generator/src/` | Creates `commands.gen.ts` |
| Utilities | `packages/utils/src/` | colors, prompt, spinner, validation |
| Tests | `packages/*/test/*.test.ts` | Bun test runner |

## CODE MAP

| Symbol | Location | Purpose |
|--------|----------|---------|
| `defineCommand` | `packages/core/src/command/` | Command builder |
| `option()` | `packages/core/src/option/` | Flag definition |
| `createPlugin` | `packages/core/src/plugin/` | Plugin factory |
| `createCLI` | `packages/core/src/cli.ts` | CLI entry point |

## CONVENTIONS

- **ESM imports**: Always use `.js` extension for local imports
- **Named exports**: Avoid default exports for tree-shaking
- **File naming**: kebab-case (`my-command.ts`)
- **Zod validation**: All command options use Zod schemas
- **Plugin store**: Typed via generics, accessed via context
- **Test files**: `.test.ts` suffix in `packages/*/test/`

## ANTI-PATTERNS (THIS PROJECT)

- `as any` / `@ts-ignore` - Never suppress type errors
- `Object.freeze()` in plugin stores - Breaks Zod validation
- Global store access - Always use context-bound store
- Missing `.js` extension on local imports
- Modifying store properties directly - Use setters

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

| Directory | Purpose |
|-----------|---------|
| `packages/core/` | CLI framework patterns |
| `packages/cli/` | bunli CLI commands |
| `packages/utils/` | Utility patterns |
| `packages/plugin-ai-detect/` | AI detection plugin |
| `packages/plugin-config/` | Config merging plugin |
| `packages/plugin-completions/` | Shell completions |
| `packages/generator/` | Type generation |
| `packages/test/` | Testing utilities |
| `packages/tui/` | TUI components |
| `packages/create-bunli/` | Scaffolding patterns |
| `examples/*/` | Example-specific patterns |
| `apps/web/` | Web app documentation |
