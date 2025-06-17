# Bunli Examples

This directory contains example Bunli CLI applications demonstrating various features and patterns, organized from simple to complex.

## Examples Overview

### minimal
The simplest possible Bunli CLI with a single command. Great starting point to understand the basics.
- Basic command definition
- Simple flag handling
- Minimal configuration

### schema-validation
Examples showcasing Bunli's schema-driven validation using Standard Schema compatible libraries.
- Type-safe options with runtime validation
- Integration with Zod, Valibot, and other validation libraries
- Custom validation rules and error messages
- Coercion and transformation

### command-structure
Demonstrates how to organize multi-command CLIs with proper structure.
- Command manifests for lazy loading
- Nested commands (e.g., `git branch`, `git commit`)
- Command aliases
- Modular command organization

### interactive
Shows how to build interactive CLI experiences using Bunli's prompt utilities.
- Interactive wizards and setup flows
- Multi-step processes with validation
- Various prompt types (text, select, multiselect, confirm)
- Dynamic prompts based on previous answers

### real-world
A complete, production-ready CLI application demonstrating best practices.
- Full project structure with configuration
- Complex commands with multiple options
- Integration with external tools (git, docker)
- Progress indicators and spinners
- Error handling and recovery
- Build configuration for distribution

## Getting Started

Each example can be run independently. Navigate to an example directory and run:

```bash
# Install dependencies (if any)
bun install

# Run the CLI
bun run cli.ts

# Or make it executable
chmod +x cli.ts
./cli.ts
```

## Progression Path

1. Start with **minimal** to understand basic concepts
2. Move to **schema-validation** to learn about type-safe options
3. Explore **command-structure** for multi-command CLIs
4. Try **interactive** for user-friendly interfaces
5. Study **real-world** for production patterns

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
For larger CLIs, use command manifests with lazy loading:

```typescript
// commands/index.ts
export default {
  serve: () => import('./serve'),
  build: () => import('./build'),
  deploy: () => import('./deploy')
}
```

### Interactive Prompts
Create engaging CLI experiences with built-in prompts:

```typescript
const name = await prompt.text('What is your name?')
const color = await prompt.select('Favorite color?', ['red', 'green', 'blue'])
const confirmed = await prompt.confirm('Continue?')
```

## Building for Distribution

See the **real-world** example for build configuration:

```typescript
// bunli.config.ts
export default defineConfig({
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['darwin-arm64', 'linux-x64', 'windows-x64']
  }
})
```

Then build with:
```bash
bunli build
```

## Learn More

- [Bunli Documentation](https://bunli.dev)
- [Standard Schema](https://github.com/standard-schema/standard-schema)
- [Bun Documentation](https://bun.sh)