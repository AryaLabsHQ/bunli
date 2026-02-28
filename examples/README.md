# Bunli Examples

This directory contains example Bunli CLI applications demonstrating various features and patterns, organized from simple to complex.

## Examples Overview

### hello-world
The absolute simplest possible Bunli CLI with a single command. Perfect starting point to understand the basics.
- Basic command definition
- Simple flag handling
- OpenTUI `render` + CLI `handler` dual mode
- Component-library showcase command (`showcase --tui`)
- Minimal configuration
- Type generation for enhanced DX

### task-runner
A practical task automation CLI showcasing validation and interactivity patterns.
- Schema validation with Zod
- Interactive prompts and confirmations
- Progress indicators and spinners
- Build, test, deploy, and setup workflows
- Conditional flows based on options

### git-tool
A Git workflow helper demonstrating command organization and external tool integration.
- Nested command structure
- Command aliases
- Integration with external tools (git)
- Shell command execution
- Colored output for status

### dev-server
A development server CLI showcasing advanced plugin system and configuration management.
- Plugin system with lifecycle hooks
- Type-safe plugin context
- Configuration management
- Long-running processes
- Real-time updates and log following

## Getting Started

Each example demonstrates the recommended Bunli development workflow:

```bash
# Navigate to an example
cd hello-world

# Install dependencies (includes bunli CLI)
bun install

# Generate types (creates .bunli/commands.gen.ts)
bun run generate

# Start development with hot reload
bun run dev

# Build for production
bun run build

# Run the built executable
bun run start

# Or run directly (without hot reload)
bun cli.ts
```

All examples include:
- `bunli.config.ts` - Configuration with `commands.entry` for codegen discovery
- Command modules registered explicitly via `cli.command(...)`
- `.bunli/commands.gen.ts` - Generated TypeScript definitions (auto-created)
- Development scripts using `bunli dev` for hot reload
- Build scripts using `bunli build` for production
- Type generation for enhanced developer experience

## Progression Path

Follow this learning path to master Bunli:

1. **hello-world** (5 min) - Learn the absolute basics
2. **task-runner** (15 min) - Validation and interactivity
3. **git-tool** (15 min) - Command structure and organization
4. **dev-server** (20 min) - Plugins and advanced patterns

Each example builds on the previous concepts and introduces new patterns.

## Key Concepts

### Schema-Driven Options
Bunli uses Standard Schema for validation, allowing you to use any compatible validation library:

```typescript
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  options: {
    port: option(
      z.number().min(1000).max(65535),
      { short: 'p', description: 'Port number' }
    )
  }
})
```

### Command Organization
For larger CLIs, organize commands in a clear structure:

```typescript
// commands/index.ts
export const commands = [
  buildCommand,
  testCommand,
  deployCommand
]
```

### Interactive Prompts
Create engaging CLI experiences with built-in prompts:

```typescript
const name = await prompt.text('What is your name?')
const color = await prompt.select('Favorite color?', {
  options: [
    { label: 'Red', value: 'red' },
    { label: 'Green', value: 'green' },
    { label: 'Blue', value: 'blue' }
  ]
})
const confirmed = await prompt.confirm('Continue?')

prompt.intro('Setup')
prompt.outro('Done')
```

### OpenTUI Rendering
Use `render` for interactive terminal UI and global flags for mode selection:

```typescript
import { registerTuiRenderer } from '@bunli/tui'

registerTuiRenderer()

const command = defineCommand({
  name: 'greet',
  render: ({ flags }) => <GreetProgress name={String(flags.name)} />,
  handler: async ({ flags }) => {
    console.log(`Hello, ${flags.name}!`)
  }
})
```

### Plugin System
Extend functionality with type-safe plugins:

```typescript
import { createPlugin } from '@bunli/core/plugin'

export const myPlugin = createPlugin({
  name: 'my-plugin',
  store: { count: 0 },
  beforeCommand({ store }) {
    store.count++
  }
})
```

## Building for Distribution

Examples now intentionally cover different build configurations:

| Example | Build Mode | Key Settings |
|---------|------------|--------------|
| `hello-world` | JS bundle mode | `targets: []`, `minify: true`, `sourcemap: true` |
| `task-runner` | Native standalone binary | `targets: ['native']`, `sourcemap: true` |
| `git-tool` | Multi-target compressed binaries | `targets: ['darwin-arm64', 'darwin-x64']`, `compress: true`, `minify: true` |
| `dev-server` | Native optimized binary | `targets: ['native']`, `minify: true`, `sourcemap: false` |

A reference config shape:

```typescript
// bunli.config.ts
import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My awesome CLI',
  
  // Command discovery for tooling/codegen
  commands: {
    entry: './cli.ts',
    directory: './commands' // optional fallback hint
  },
  
  // Plugins are optional (default: [])
  plugins: [],
  
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['native'],  // Example target
    compress: false,      // Default: false
    minify: false,        // Default: false
    sourcemap: true       // Default: true
  },
  
  dev: {
    watch: true,
    inspect: false
  }
})
```

Build commands:
```bash
# Build for current platform
bun run build

# Bundle mode (no compile): set targets: [] in bunli.config.ts, then run
bun run build

# Build for specific platforms
bunli build --targets darwin-arm64,linux-x64

# Build for all platforms
bunli build --targets all

# Build with custom settings
bunli build --minify --sourcemap
```

The Bunli CLI handles:
- Hot reload in development (`bunli dev`)
- Standalone executable creation with Bun's `--compile` flag
- Multi-platform builds
- Optional compression for manual distribution (`build.compress`)

## Release Configuration Matrix

Release permutations to test in example projects:

```typescript
release: {
  npm: true,                 // or false / --npm=false
  github: false,             // or true / --github=true
  tagFormat: 'v{{version}}', // shared by git + GitHub release tags
  conventionalCommits: true,
  binary: {
    packageNameFormat: '{{name}}-{{platform}}',
    shimPath: 'bin/run.mjs'
  }
}
```

CLI release examples:

```bash
# Dry run
bunli release --dry

# Note: when npm publish is enabled, --dry executes npm publish in dry-run mode.

# Disable npm publish
bunli release --npm=false

# Create GitHub release entry
bunli release --github=true
```

For stable, release-ready archives + `checksums.txt` and Homebrew automation, use the
`bunli-releaser` GitHub Action instead of uploading `dist/` directly.

## Learn More

- [Bunli Documentation](https://bunli.dev)
- [Standard Schema](https://github.com/standard-schema/standard-schema)
- [Bun Documentation](https://bun.sh)
