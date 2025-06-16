# Bunli

> The Complete CLI Development Ecosystem for Bun

Bunli is a minimal, type-safe CLI framework designed specifically for Bun. It leverages Bun's unique features like the Bun Shell, fast startup times, and native TypeScript support to create efficient command-line tools that compile to standalone binaries.

## Packages

- **[@bunli/core](./packages/bunli)** - Core framework with type-safe command definitions
- **[create-bunli](./packages/create-bunli)** - Scaffolding tool for new CLI projects
- **[bunli](./packages/cli)** - CLI toolchain for development and building
- **[@bunli/utils](./packages/utils)** - Shared utilities (prompts, spinners, colors)
- **[@bunli/test](./packages/test)** - Testing utilities for CLI applications

## Getting Started

```bash
# Install Bunli CLI globally
bun add -g bunli

# Create a new CLI project
bunx create-bunli my-cli

# Start development
cd my-cli
bunli dev
```

## Development

This is a monorepo managed with Bun workspaces.

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test

# Start development
bun run dev
```

## License

MIT