# Dev Server Example

A development server CLI that demonstrates advanced plugin system usage, configuration management, and long-running processes.

## Features Demonstrated

- **Plugin System**: Custom metrics plugin with lifecycle hooks
- **Configuration Management**: Loading config from multiple sources
- **Long-running Processes**: Server management with graceful shutdown
- **Real-time Operations**: Log following and live updates
- **Type-safe Plugin Context**: Accessing plugin stores in commands

## Commands

### `start` - Start Development Server
```bash
bun run cli.ts start --port 3000 --host localhost --watch --open
```

Starts a development server with hot reload capabilities. Demonstrates:
- Long-running processes
- Plugin context access
- Graceful shutdown handling

### `build` - Build for Production
```bash
bun run cli.ts build --output dist --minify --sourcemap --target node
```

Builds the project for production. Shows:
- Multi-step progress indicators
- Plugin metrics recording
- Configuration access

### `env` - Environment Management
```bash
bun run cli.ts env --set API_KEY=abc123
bun run cli.ts env --get API_KEY
bun run cli.ts env --list
```

Manages environment variables. Demonstrates:
- Conditional command flows
- File system operations
- Plugin event recording

### `logs` - View Server Logs
```bash
bun run cli.ts logs --follow --lines 100 --level info --service server
```

Views and follows server logs. Shows:
- Real-time streaming
- Log filtering and formatting
- Process signal handling

## Plugin System

### Metrics Plugin
The custom metrics plugin demonstrates:
- **Store Management**: Type-safe plugin stores
- **Lifecycle Hooks**: `beforeCommand`, `afterCommand`, `onError`
- **Event Recording**: Automatic command tracking
- **Memory Management**: Event cleanup and limits

### Built-in Plugins
- **Config Plugin**: Loads configuration from multiple sources
- **AI Detection Plugin**: Detects AI coding assistants

## Configuration

The CLI loads configuration from:
1. `.devserverrc.json`
2. `devserver.config.json`
3. Command-line flags (highest priority)

## Running the Example

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run built version
bun run start
```

## Key Patterns

1. **Plugin Integration**: Commands access plugin context for metrics and config
2. **Long-running Processes**: Server commands handle graceful shutdown
3. **Real-time Updates**: Log following with proper signal handling
4. **Type Safety**: Full TypeScript support for plugin stores
5. **Configuration**: Multi-source config loading with validation

## Next Steps

This example shows advanced Bunli patterns. Try:
- Adding more plugins
- Implementing real server functionality
- Adding more configuration options
- Creating custom plugin types

## Related Examples

- **hello-world**: Basic command structure
- **task-runner**: Validation and interactivity
- **git-tool**: Command organization and external tools
