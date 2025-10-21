# Bunli TUI Demo

This example demonstrates the Terminal User Interface capabilities of Bunli CLI framework with the `@bunli/tui` package.

## Overview

The demo showcases:
- Interactive command execution with progress indicators
- Color-coded output and formatting
- Terminal capability detection
- Spinner animations for long-running operations
- Command configuration with various input types
- Type generation for TUI commands

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
Demonstrates Terminal User Interface capabilities with different demo modes.

```bash
# Dashboard demo - shows menu navigation and layout
bun src/index.ts custom --demo dashboard

# Progress bar demo - animated progress indicators
bun src/index.ts custom --demo progress

# Form demo - interactive form concepts
bun src/index.ts custom --demo form
```

Options:
- `--demo, -d` - Demo type (dashboard/progress/form)

## Type Generation for TUI Commands

This example includes type generation that works seamlessly with TUI commands:

```typescript
// Generated in commands.gen.ts
import { getCommandApi, listCommands } from './commands.gen'

// Get TUI command metadata
const commands = listCommands()
const newApi = getCommandApi('new')
const deployApi = getCommandApi('deploy')

// Type-safe TUI component props
interface TUIComponentProps {
  command: string
  options: Record<string, any>
  schema: any
}

function createTUIForm(commandName: string): TUIComponentProps {
  const command = getCommandApi(commandName as any)
  
  return {
    command: commandName,
    options: command.options,
    schema: {
      // Convert command options to TUI schema
      fields: Object.entries(command.options).map(([name, option]) => ({
        name,
        type: option.type,
        required: option.required,
        description: option.description,
        default: option.default
      }))
    }
  }
}

// Use with OpenTUI
const formProps = createTUIForm('new')
console.log(formProps.schema.fields) // TUI form fields
```

The generated types provide:
- **TUI component props** with full type safety
- **Command metadata** for form generation
- **Type-safe option access** for TUI components
- **IntelliSense** for TUI-specific functionality

## TUI Plugin Features

The `@bunli/tui` provides:
- Auto-generated forms from Zod schemas
- Interactive mode for missing flags
- Custom TUI component support
- Terminal rendering with OpenTUI
- Theme customization
- Mouse and keyboard event handling

## Implementation Details

The demo includes two TUI implementations:

1. **Simple TUI** (currently active) - A custom implementation using ANSI escape codes that demonstrates:
   - Box drawing with Unicode characters
   - Text positioning and coloring
   - Menu navigation (in interactive terminals)
   - Progress bar animations
   - Keyboard input handling

2. **OpenTUI Plugin** (temporarily disabled) - The full plugin implementation that would provide:
   - Full TypeScript support with proper type definitions
   - Plugin lifecycle hooks (beforeCommand, afterCommand, onError)
   - OpenTUI renderer integration
   - Auto-form generation from command schemas
   - Interactive flag collection
   - Advanced component support

The custom TUI command shows static previews in non-interactive environments and fully interactive demos when run in a proper terminal.

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
bun run typecheck

# Run in watch mode
bun run dev
```