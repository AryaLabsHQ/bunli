# Bunli TUI Demo

This example demonstrates the Terminal User Interface capabilities of Bunli CLI framework with the `@bunli/plugin-tui` package.

## Overview

The demo showcases:
- Interactive command execution with progress indicators
- Color-coded output and formatting
- Terminal capability detection
- Spinner animations for long-running operations
- Command configuration with various input types

## Commands

### `new` - Create a new project
Creates a new project with interactive setup options.

```bash
bun src/index.ts new --name my-project --type library
```

Options:
- `--name, -n` - Project name
- `--type, -t` - Project type (library/application/monorepo)
- `--framework, -f` - Runtime framework (bun/node/deno)
- `--typescript, -ts` - Use TypeScript
- `--git, -g` - Initialize git repository
- `--installDeps, -i` - Install dependencies
- `--author` - Author name
- `--license` - License type

### `configure` - Configure application settings
Configure application settings interactively.

```bash
bun src/index.ts configure --apiUrl https://api.example.com --apiKey mykey123
```

Options:
- `--apiUrl` - API endpoint URL
- `--apiKey` - API authentication key
- `--region` - Deployment region
- `--maxConnections` - Maximum concurrent connections
- `--timeout` - Request timeout in milliseconds
- `--retries` - Number of retry attempts
- `--debug` - Enable debug mode
- `--features` - Enable features (analytics/monitoring/logging/caching)

### `deploy` - Deploy application
Deploy your application with interactive configuration.

```bash
bun src/index.ts deploy my-app --environment production --dryRun
```

Options:
- `--environment, -e` - Target environment (development/staging/production)
- `--branch, -b` - Git branch to deploy
- `--skipTests, -S` - Skip running tests
- `--skipBuild` - Skip build step
- `--dryRun, -d` - Perform a dry run
- `--instances` - Number of instances
- `--memory` - Memory per instance
- `--autoscale` - Enable auto-scaling
- `--notify` - Email addresses to notify

### `custom` - Custom TUI demonstration
Demonstrates custom TUI implementation capabilities (currently shows terminal info).

```bash
bun src/index.ts custom
```

## TUI Plugin Features

The `@bunli/plugin-tui` provides:
- Auto-generated forms from Zod schemas
- Interactive mode for missing flags
- Custom TUI component support
- Terminal rendering with OpenTUI
- Theme customization
- Mouse and keyboard event handling

## Current Status

The TUI plugin is fully implemented but temporarily disabled in this demo due to OpenTUI initialization issues in non-interactive environments. The plugin code is complete and includes:

- Full TypeScript support with proper type definitions
- Plugin lifecycle hooks (beforeCommand, afterCommand, onError)
- OpenTUI renderer integration
- Auto-form generation from command schemas
- Interactive flag collection
- Custom TUI mode support

## Running the Demo

```bash
# Install dependencies
bun install

# Run commands
bun src/index.ts --help
bun src/index.ts new --name my-project
bun src/index.ts deploy my-app --environment production
```

## Development

```bash
# Type check
bun run type-check

# Run in watch mode
bun run dev
```