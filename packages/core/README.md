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

## Plugin System

Bunli provides a powerful plugin system with compile-time type safety:

### Basic Plugin

```typescript
import { BunliPlugin, createPlugin } from '@bunli/core'

interface MyPluginStore {
  apiKey: string
  isAuthenticated: boolean
}

const myPlugin: BunliPlugin<MyPluginStore> = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Define the plugin's store
  store: {
    apiKey: '',
    isAuthenticated: false
  },
  
  // Lifecycle hooks
  setup(context) {
    // One-time initialization
    context.updateConfig({ customField: 'value' })
  },
  
  configResolved(config) {
    // Called after all configuration is resolved
  },
  
  beforeCommand(context) {
    // Called before each command - context.store is type-safe!
    context.store.apiKey = process.env.API_KEY || ''
    context.store.isAuthenticated = !!context.store.apiKey
  },
  
  afterCommand(context) {
    // Called after each command with results
    if (context.error) {
      console.error('Command failed:', context.error)
    }
  }
}
```

### Plugin Factory

Use `createPlugin` for better ergonomics:

```typescript
import { createPlugin } from '@bunli/core'

export const authPlugin = createPlugin((options: AuthOptions) => {
  return {
    name: 'auth-plugin',
    store: {
      token: '',
      user: null as User | null
    },
    async beforeCommand(context) {
      const token = await loadToken()
      context.store.token = token
      context.store.user = await fetchUser(token)
    }
  }
})
```

### Using Plugins with Type Safety

```typescript
const cli = await createCLI({
  name: 'my-cli',
  version: '1.0.0',
  plugins: [
    authPlugin({ provider: 'github' }),
    myPlugin
  ]
})

// In your commands, the store is fully typed!
cli.command({
  name: 'deploy',
  handler: async ({ context }) => {
    // TypeScript knows about all plugin stores!
    if (!context?.store.isAuthenticated) {
      throw new Error('Not authenticated')
    }
    console.log(`Deploying as ${context.store.user?.name}`)
  }
})
```

### Module Augmentation

Plugins can extend Bunli's interfaces:

```typescript
declare module '@bunli/core' {
  interface EnvironmentInfo {
    isCI: boolean
    ciProvider?: string
  }
}
```

## License

MIT © Arya Labs, Inc.