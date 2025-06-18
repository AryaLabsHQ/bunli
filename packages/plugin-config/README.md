# @bunli/plugin-config

Configuration file merger plugin for Bunli CLI framework. Loads and merges configuration from multiple sources including user home directory and project-specific config files.

## Installation

```bash
bun add @bunli/plugin-config
```

## Usage

```typescript
import { createCLI } from '@bunli/core'
import { configMergerPlugin } from '@bunli/plugin-config'

const cli = await createCLI({
  name: 'my-cli',
  version: '1.0.0',
  plugins: [
    configMergerPlugin({
      sources: [
        '~/.config/{{name}}/config.json',
        '.{{name}}rc.json',
        '.{{name}}rc',
        'package.json'
      ]
    })
  ]
})

// Config is automatically merged into your CLI configuration
```

## Options

```typescript
interface ConfigMergerOptions {
  /**
   * List of config file paths to load
   * Supports {{name}} template which is replaced with CLI name
   * Paths starting with ~ are expanded to home directory
   */
  sources: string[]
  
  /**
   * Merge strategy for combining configs
   * - 'deep': Recursively merge objects (default)
   * - 'shallow': Only merge top-level properties
   */
  mergeStrategy?: 'deep' | 'shallow'
  
  /**
   * Stop after finding the first config file
   * Default: false (loads and merges all found configs)
   */
  stopOnFirst?: boolean
  
  /**
   * Custom config parser (e.g., for YAML, TOML)
   * Default: JSON.parse
   */
  parser?: (content: string) => any
  
  /**
   * Transform config after loading
   */
  transform?: (config: any) => any
}
```

## Config File Formats

By default, the plugin supports JSON files. Common patterns:

### RC Files
```bash
# These are equivalent for a CLI named "my-cli"
.my-clirc
.my-clirc.json
```

### Home Directory Config
```bash
~/.config/my-cli/config.json
~/.my-clirc
```

### Package.json
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "my-cli": {
    "apiKey": "secret",
    "theme": "dark"
  }
}
```

## Template Variables

- `{{name}}` - Replaced with your CLI's name

## Load Order

Configs are loaded in the order specified and merged together. Later configs override earlier ones.

```typescript
// Example: User config overrides defaults
configMergerPlugin({
  sources: [
    '/etc/my-cli/defaults.json',    // System defaults
    '~/.config/my-cli/config.json', // User config
    '.my-clirc'                     // Project config
  ]
})
```

## Stop on First

Use `stopOnFirst` to implement fallback behavior:

```typescript
configMergerPlugin({
  sources: [
    '.my-clirc',                    // Check project first
    '~/.config/my-cli/config.json', // Then user
    '/etc/my-cli/defaults.json'     // Finally system
  ],
  stopOnFirst: true // Use only the first found
})
```

## Custom Parsers

Support other formats with custom parsers:

```typescript
import { parse as parseYAML } from 'yaml'

configMergerPlugin({
  sources: ['.my-cli.yml', '.my-cli.yaml'],
  parser: parseYAML
})
```

## Transform Configs

Apply transformations after loading:

```typescript
configMergerPlugin({
  sources: ['.my-clirc'],
  transform: (config) => {
    // Expand environment variables
    if (config.apiKey === '$API_KEY') {
      config.apiKey = process.env.API_KEY
    }
    return config
  }
})
```

## Error Handling

Missing config files are silently ignored. Parse errors are logged but don't crash the CLI.

## License

MIT © Arya Labs, Inc.