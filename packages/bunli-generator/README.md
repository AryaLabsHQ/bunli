# @bunli/generator

The Bunli command type generator that creates TypeScript definitions from your CLI commands using Bun's native APIs.

## Features

- **Bun-Native**: Uses `Bun.Glob` for fast file scanning
- **Type-Safe**: Generates full TypeScript definitions with module augmentation
- **Schema-Aware**: Extracts metadata from Zod, Valibot, and other schema libraries
- **Watch Mode**: Integrated with Bun's native watch capabilities
- **Minimal Dependencies**: Uses Babel for AST parsing, Bun APIs for everything else

## Usage

### Basic Generation

```typescript
import { Generator } from '@bunli/generator'

const generator = new Generator({
  commandsDir: './commands',
  outputFile: './commands.gen.ts'
})

await generator.run()
```

### With Watch Mode

```typescript
import { Generator } from '@bunli/generator'

const generator = new Generator({
  commandsDir: './commands',
  outputFile: './commands.gen.ts'
})

// Initial generation
await generator.run()

// Watch for changes (integrated with Bun's watch mode)
// This is handled automatically by bunli dev
```

## Generated Output

The generator creates a `commands.gen.ts` file with:

```typescript
// Generated command registry
export interface CommandRegistry {
  'deploy': {
    name: 'deploy'
    description: 'Deploy your application'
    options: {
      env: { type: 'string', required: true, description: 'Environment' }
      force: { type: 'boolean', required: false, default: false }
    }
    filePath: './commands/deploy.ts'
    exportPath: './commands/deploy'
  }
}

// Module augmentation for @bunli/core
declare module '@bunli/core' {
  interface GeneratedCommands extends CommandRegistry {}
}

// Helper functions
export function getCommandApi<T extends keyof CommandRegistry>(name: T): CommandRegistry[T]
export function getCommandNames(): (keyof CommandRegistry)[]
export function hasCommand(name: string): name is keyof CommandRegistry
export function getCommandByAlias(alias: string): keyof CommandRegistry | undefined
export function listCommands(): Array<{...}>
```

## Command File Structure

The generator scans for files matching `**/*.{ts,tsx,js,jsx}` and looks for `defineCommand` calls:

```typescript
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy',
  description: 'Deploy your application',
  alias: 'd',
  options: {
    env: option(z.string(), { 
      description: 'Environment to deploy to',
      short: 'e'
    }),
    force: option(z.boolean().default(false), {
      description: 'Force deployment'
    })
  },
  handler: async ({ flags }) => {
    // Implementation
  }
})
```

## Integration with Bunli CLI

The generator is automatically integrated with:

- `bunli dev` - Generates types and watches for changes
- `bunli build` - Pre-build codegen step
- `bunli generate` - Standalone generation command

## Configuration

Configure the generator in your `bunli.config.ts`:

```typescript
import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'my-cli',
  version: '1.0.0',
  
  codegen: {
    enabled: true,
    commandsDir: './commands',
    output: './commands.gen.ts'
  }
})
```

## API Reference

### Generator

```typescript
class Generator {
  constructor(config: GeneratorConfig)
  async run(event?: GeneratorEvent): Promise<void>
  getConfig(): GeneratorConfig
  updateConfig(updates: Partial<GeneratorConfig>): void
}
```

### Types

```typescript
interface GeneratorConfig {
  commandsDir: string
  outputFile: string
  config?: any
}

interface GeneratorEvent {
  type: 'create' | 'update' | 'delete'
  path: string
}

interface CommandMetadata {
  name: string
  description: string
  alias?: string | string[]
  options?: Record<string, OptionMetadata>
  filePath: string
  exportPath: string
}
```

## Performance

- **Fast Scanning**: Uses Bun's native `Bun.Glob` for file discovery
- **Incremental**: Only regenerates when command files change
- **Memory Efficient**: Processes files one at a time
- **TypeScript Optimized**: Generates minimal, efficient type definitions

## License

MIT
