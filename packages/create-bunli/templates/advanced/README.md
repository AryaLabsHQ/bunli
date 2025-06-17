# {{projectName}}

{{description}}

## Installation

```bash
# Install globally
bun add -g {{projectName}}

# Or use directly with bunx
bunx {{projectName}} [command]
```

## Usage

```bash
{{projectName}} <command> [options]
```

### Commands

#### `init`
Initialize a new configuration file in the current directory.

```bash
{{projectName}} init [options]

Options:
  -f, --force     Overwrite existing config
  -t, --template  Config template to use
```

#### `validate`
Validate files against defined rules.

```bash
{{projectName}} validate <files...> [options]

Options:
  -c, --config    Path to config file
  -f, --fix       Auto-fix issues
  --no-cache      Disable caching
```

#### `serve`
Start a development server.

```bash
{{projectName}} serve [options]

Options:
  -p, --port      Port to listen on (default: 3000)
  -h, --host      Host to bind to (default: localhost)
  --no-open       Don't open browser
```

#### `config`
Manage configuration settings.

```bash
{{projectName}} config <action> [key] [value]

Actions:
  get <key>       Get a config value
  set <key> <value>  Set a config value
  list            List all config values
  reset           Reset to defaults
```

### Global Options

- `-v, --version` - Show version
- `-h, --help` - Show help
- `--verbose` - Enable verbose output
- `--quiet` - Suppress output
- `--no-color` - Disable colored output

## Configuration

Create a `{{projectName}}.config.js` file in your project root:

```javascript
export default {
  // Configuration options
  rules: {
    // Define your rules
  },
  server: {
    port: 3000,
    host: 'localhost'
  }
}
```

## Development

```bash
# Install dependencies
bun install

# Run in development
bun dev

# Run tests
bun test

# Build for production
bun run build
```

## License

{{license}}