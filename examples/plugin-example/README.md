# Plugin System Example

This example demonstrates the Bunli plugin system with both built-in and custom plugins.

## Features Demonstrated

- **Config Merger Plugin**: Loads configuration from multiple sources
- **AI Agent Detection Plugin**: Detects if running in an AI coding assistant
- **Custom Timing Plugin**: Adds timing information to commands
- **Plugin Context**: Access injected data in command handlers

## Usage

```bash
# Install dependencies
bun install

# Run the info command
bun cli.ts info

# Show help
bun cli.ts --help

# Test AI agent detection
CLAUDE_CODE=true bun cli.ts info

# Test with Cursor
CURSOR_VERSION=0.1.0 bun cli.ts info
```

## Configuration

The config merger plugin will look for configuration in:
1. `~/.config/plugin-example/config.json`
2. `.plugin-examplerc.json` in the current directory

Example config file:
```json
{
  "apiKey": "your-api-key",
  "debug": true
}
```

## Creating Custom Plugins

```typescript
interface MyPluginStore {
  myData: { foo: string }
  startTime: number
}

const myPlugin: BunliPlugin<MyPluginStore> = {
  name: 'my-plugin',
  
  // Define the plugin's store
  store: {
    myData: { foo: 'bar' },
    startTime: 0
  },
  
  // One-time setup when CLI initializes
  setup(context) {
    // Load config, register commands, etc
    context.updateConfig({ customField: 'value' })
  },
  
  // Called after all config is resolved
  configResolved(config) {
    console.log('Final config:', config)
  },
  
  // Called before each command
  beforeCommand(context) {
    // Store data for commands to use - fully type-safe!
    context.store.startTime = Date.now()
    context.store.myData = { foo: 'bar' }
  },
  
  // Called after each command
  afterCommand(context) {
    // Cleanup, logging, etc
    const duration = Date.now() - context.store.startTime
    console.log(`Command took ${duration}ms`)
    
    if (context.error) {
      console.error('Command failed:', context.error)
    }
  }
}
```

## Plugin Development Tips

1. **Use TypeScript**: Plugins are fully typed with compile-time type safety
2. **Define Store Types**: Always define an interface for your plugin's store
3. **Handle Errors**: Use try/catch in hooks to prevent breaking the CLI
4. **Document Store**: Tell users what data your plugin provides in the store
5. **Use createPlugin**: The factory function provides better ergonomics

## Built-in Plugins

### Config Merger Plugin
```typescript
import { configMergerPlugin } from '@bunli/plugin-config'

// Loads from multiple sources and merges
configMergerPlugin({
  sources: ['~/.config/{{name}}/config.json', '.{{name}}rc'],
  mergeStrategy: 'deep', // or 'shallow'
  stopOnFirst: false      // or true to use first found
})
```

### AI Agent Detection Plugin
```typescript
import { aiAgentPlugin } from '@bunli/plugin-ai-detect'

// Detects Claude, Cursor, Copilot, etc
aiAgentPlugin({
  verbose: true,  // Log when detected
  customAgents: [ // Add your own
    {
      name: 'my-ai',
      envVars: ['MY_AI_ENABLED'],
      detect: (env) => !!env.MY_AI_ENABLED
    }
  ]
})
```