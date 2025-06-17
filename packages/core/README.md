# @bunli/core

The minimal, type-safe CLI framework for Bun.

## Installation

```bash
bun add @bunli/core
```

## Quick Start

```typescript
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'greet',
  description: 'A friendly greeting',
  options: {
    name: option(
      z.string().min(1),
      { description: 'Name to greet', short: 'n' }
    ),
    excited: option(
      z.coerce.boolean().default(false),
      { description: 'Add excitement', short: 'e' }
    )
  },
  handler: async ({ flags }) => {
    const greeting = `Hello, ${flags.name}${flags.excited ? '!' : '.'}`
    console.log(greeting)
  }
})
```

## Features

- 🚀 **Type-safe** - Full TypeScript support with automatic type inference
- ⚡ **Fast** - Powered by Bun's native speed
- 📦 **Zero config** - Works out of the box with sensible defaults
- 🎯 **Minimal API** - Learn once, use everywhere
- 🔌 **Extensible** - Plugin system for custom functionality
- 🧪 **Testable** - First-class testing utilities included

## Core Concepts

### Commands

Define commands with automatic type inference:

```typescript
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: 'build',
  description: 'Build the project',
  handler: async () => {
    console.log('Building...')
  }
})
```

### Options

Use the `option` helper with Standard Schema validation:

```typescript
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy',
  options: {
    env: option(
      z.enum(['dev', 'staging', 'prod']),
      { description: 'Target environment' }
    ),
    force: option(
      z.coerce.boolean().default(false),
      { description: 'Force deployment', short: 'f' }
    )
  },
  handler: async ({ flags }) => {
    // TypeScript knows:
    // flags.env is 'dev' | 'staging' | 'prod'
    // flags.force is boolean
  }
})
```

### Multi-Command CLIs

Create complex CLIs with multiple commands:

```typescript
import { createCLI } from '@bunli/core'
import build from './commands/build'
import deploy from './commands/deploy'
import test from './commands/test'

const cli = createCLI({
  name: 'my-tool',
  version: '1.0.0',
  description: 'My awesome CLI tool',
  commands: [build, deploy, test]
})

await cli.run()
```

## API Reference

### `defineCommand(config)`

Creates a command definition with full type inference.

### `option(schema, config)`

Creates a typed option with schema validation.

### `createCLI(config)`

Creates a multi-command CLI application.

### `defineConfig(config)`

Defines shared configuration for your CLI.

## License

MIT © Arya Labs, Inc.