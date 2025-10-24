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

### Plugin Development Utilities

Bunli provides utilities for plugin development and testing:

```typescript
import { 
  createTestPlugin, 
  composePlugins, 
  createMockPluginContext,
  testPluginHooks,
  assertPluginBehavior 
} from '@bunli/core/plugin'

// Create a test plugin
const testPlugin = createTestPlugin(
  { count: 0, message: '' },
  {
    beforeCommand(context) {
      context.store.count++
      console.log(`Count: ${context.store.count}`)
    }
  }
)

// Compose multiple plugins
const composedPlugin = composePlugins(
  authPlugin({ provider: 'github' }),
  loggingPlugin({ level: 'debug' }),
  metricsPlugin({ enabled: true })
)

// Test plugin behavior
const results = await testPluginHooks(testPlugin, {
  config: { name: 'test-cli', version: '1.0.0' },
  store: { count: 0, message: 'test' }
})

assertPluginBehavior(results, {
  beforeCommandShouldSucceed: true
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

### Generated Helpers

Bunli automatically generates type-safe helpers for your commands. These are auto-loaded when you set `generated: true` in your CLI config:

```typescript
const cli = await createCLI({
  name: 'my-cli',
  version: '1.0.0',
  generated: true  // Auto-load generated types
})
```

#### Available Helpers

```typescript
import { 
  listCommands, 
  getCommandApi, 
  getTypedFlags,
  validateCommand,
  findCommandByName,
  findCommandsByDescription,
  getCommandNames
} from './.bunli/commands.gen'

// List all available commands
const commands = listCommands()
// Result: ['build', 'dev', 'test', ...]

// Get command metadata
const buildMeta = getCommandApi('build')
console.log(buildMeta.description) // "Build the project"
console.log(buildMeta.options)     // { outdir: {...}, watch: {...} }

// Get typed flags for a command
const flags = getTypedFlags('build')
// flags.outdir is typed as string | undefined
// flags.watch is typed as boolean | undefined

// Validate command arguments at runtime
const result = validateCommand('build', { outdir: 'dist', watch: true })
if (result.success) {
  console.log('Valid arguments:', result.data)
} else {
  console.error('Validation errors:', result.errors)
}

// Find commands by name or description
const buildCmd = findCommandByName('build')
const devCommands = findCommandsByDescription('development')
const allNames = getCommandNames()
```

#### IDE Auto-Import Support

Configure TypeScript path mapping for better IDE support:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "~commands/*": ["./.bunli/commands.gen.ts"]
    }
  }
}
```

Then use auto-imports:

```typescript
// These will show up in IDE auto-complete
import { listCommands } from '~commands/helpers'
import { getCommandApi } from '~commands/api'
```

<Callout type="tip">
  Generated helpers provide full type safety and runtime introspection for your CLI commands. They're automatically updated when you modify your command definitions.
</Callout>

## Runtime Validation

Bunli provides runtime validation utilities for dynamic type checking:

```typescript
import { 
  validateValue, 
  validateValues, 
  isValueOfType,
  createValidator,
  createBatchValidator 
} from '@bunli/core'

// Validate a single value
const result = await validateValue(
  'hello', 
  z.string().min(1).schema, 
  { option: 'message', command: 'greet' }
)

// Validate multiple values
const validated = await validateValues(
  { name: 'John', age: 25 },
  { 
    name: z.string().schema, 
    age: z.number().schema 
  },
  'user'
)

// Check value types
if (isValueOfType(value, 'string')) {
  console.log('Value is a string')
}

// Create reusable validators
const nameValidator = createValidator(z.string().min(1).schema)
const userValidator = createBatchValidator({
  name: z.string().schema,
  age: z.number().schema
})
```

## Type Utilities

Bunli exports advanced TypeScript type utilities for complex type manipulation, especially useful when working with generated types:

```typescript
import { 
  UnionToIntersection, 
  MergeAll, 
  Expand,
  DeepPartial,
  Constrain,
  NonEmptyArray,
  IsNever,
  IsAny,
  IsUnknown
} from '@bunli/core'
```

### Key Utilities

**UnionToIntersection** - Convert union types to intersection types:
```typescript
type Example = UnionToIntersection<{ a: string } | { b: number }>
// Result: { a: string } & { b: number }
```

**MergeAll** - Merge multiple object types:
```typescript
type Example = MergeAll<[{ a: string }, { b: number }, { c: boolean }]>
// Result: { a: string; b: number; c: boolean }
```

**Expand** - Expand complex types for better IntelliSense:
```typescript
type Example = Expand<{ nested: { deep: { value: string } } }>
// Shows full type structure in IDE
```

**DeepPartial** - Make all properties optional recursively:
```typescript
type Example = DeepPartial<{ user: { name: string; age: number } }>
// Result: { user?: { name?: string; age?: number } }
```

**Constrain** - Constrain types with fallback:
```typescript
type Example = Constrain<string, 'a' | 'b' | 'c', 'a'>
// Result: 'a' | 'b' | 'c' (or 'a' if string doesn't match)
```

### Usage with Generated Types

These utilities work particularly well with generated command types:

```typescript
import { getCommandApi, listCommands } from './commands.gen'
import { UnionToIntersection, MergeAll } from '@bunli/core'

// Get all command options as a union
type AllCommandOptions = UnionToIntersection<
  ReturnType<typeof getCommandApi>[keyof CommandRegistry]['options']
>

// Merge all command metadata
type AllCommands = MergeAll<
  Array<{ name: string; description: string }>
>
```

<Callout type="tip">
  These utilities are especially powerful when combined with generated types for creating CLI wrappers, documentation generators, and command analytics tools.
</Callout>

## Related Packages

- **[@bunli/generator](/docs/packages/generator)** - Generate TypeScript definitions from commands
- **[@bunli/utils](/docs/packages/utils)** - Shared utilities for CLI development
- **[@bunli/test](/docs/packages/test)** - Testing utilities for CLI applications

## Documentation

- [Getting Started](/docs/getting-started) - Step-by-step tutorial
- [Type Generation Guide](/docs/guides/type-generation) - Learn about code generation
- [API Reference](/docs/api) - Complete API documentation

## License

MIT © Arya Labs, Inc.