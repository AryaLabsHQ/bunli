# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bunli is a minimal, type-safe CLI framework for Bun. It's a monorepo managed with Bun workspaces and Turborepo.

### Key Packages

- **@bunli/core** - Core CLI framework with type-safe command definitions
- **@bunli/utils** - Shared utilities (colors, prompts, spinners, validation)
- **@bunli/test** - Testing utilities for CLI applications
- **bunli** - CLI toolchain for development and building
- **create-bunli** - Project scaffolding tool

## Development Commands

### Root Level
```bash
bun run build    # Build all packages via Turbo
bun test         # Run all tests
bun run clean    # Clean build artifacts
bun run release  # Release packages
```

### Package Level
```bash
bun run build      # Build package and generate types
bun test           # Run package tests
bun run type-check # Type check without emitting
```

### Running Single Tests
```bash
bun test path/to/test.test.ts  # Run specific test file
bun test -t "test name"         # Run tests matching pattern
```

## Architecture & Code Patterns

### Module System
- Pure ESM modules (all packages have `"type": "module"`)
- TypeScript with `"moduleResolution": "bundler"`
- No `.js` extensions needed in imports (unlike NodeNext resolution)
- Use named exports, avoid default exports

### Command Definition Pattern
Commands in Bunli use a type-safe builder pattern:

```typescript
export const command = defineCommand({
  name: 'command-name',
  description: 'Command description',
  flags: {
    flagName: flag.string().optional()
  },
  handler: async ({ flags }) => {
    // Implementation
  }
});
```

### Package Exports
Each package uses explicit exports in package.json:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./src/index.ts"
    }
  }
}
```

### Build System
- Custom build scripts in `scripts/build.ts` for each package
- Turbo manages inter-package dependencies
- TypeScript compilation only for type declarations (Bun runs .ts directly)

### Testing Patterns
- Use Bun's built-in test runner
- Test files use `.test.ts` suffix
- @bunli/test provides CLI-specific testing utilities
- Mock commands and capture output using test helpers

## Important Conventions

- **Always use Bun** instead of npm/yarn/pnpm
- **Always use ESM** - no CommonJS
- **File naming**: Always use kebab-case (e.g., `my-command.ts`)
- **Imports**: No file extensions needed due to bundler resolution
- **Type exports**: Export types explicitly for better tree-shaking

## Common Tasks

### Adding a New Command
1. Create command file in appropriate package
2. Use `defineCommand` from @bunli/core
3. Export from package index
4. Add tests using @bunli/test utilities

### Creating a New Package
1. Create directory under `packages/`
2. Add package.json with ESM configuration
3. Add to root workspace in package.json
4. Configure build script following existing patterns
5. Add to Turbo pipeline if needed

### Running Examples
```bash
cd examples/[example-name]
bun run src/index.ts [command]
```

## Type Safety

Bunli emphasizes type safety throughout:
- Command flags are fully typed
- Validation schemas integrate with TypeScript
- Builder pattern ensures compile-time safety
- Test utilities provide typed mocks and assertions