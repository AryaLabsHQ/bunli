# @bunli/plugin-tui

Terminal User Interface (TUI) plugin for Bunli CLI framework. Automatically generates interactive forms from command schemas and enables rich terminal interfaces.

## Features

- 🎨 **Auto-generated Forms** - Automatically create interactive forms from Zod schemas
- 🎯 **Type-safe** - Full TypeScript support with schema inference
- 🎮 **Keyboard Navigation** - Tab between fields, arrow keys for selection
- 🎨 **Theming** - Built-in light and dark themes
- 🔌 **Extensible** - Create custom components and views
- ♿ **Accessible** - Keyboard-only navigation, clear focus indicators

## Installation

```bash
bun add @bunli/plugin-tui @opentui/core
```

## Quick Start

```typescript
import { createCLI, defineCommand, option } from '@bunli/core'
import { tuiPlugin } from '@bunli/plugin-tui'
import { z } from 'zod'

const cli = await createCLI({
  name: 'my-cli',
  version: '1.0.0',
  plugins: [
    tuiPlugin({
      theme: 'dark'
    })
  ]
})

cli.command(defineCommand({
  name: 'deploy',
  description: 'Deploy your application',
  options: {
    environment: option(z.enum(['production', 'staging', 'dev']), {
      description: 'Target environment'
    }),
    version: option(z.string().optional(), {
      description: 'Version tag'
    }),
    dryRun: option(z.boolean().default(false), {
      description: 'Perform a dry run'
    })
  },
  handler: async ({ flags }) => {
    console.log('Deploying:', flags)
  }
}))

await cli.run()
```

Run with `--interactive` flag to see the auto-generated form:

```bash
my-cli deploy --interactive
```

## Plugin Options

```typescript
tuiPlugin({
  // Theme configuration
  theme: 'dark', // 'light' | 'dark' | custom theme object
  
  // Auto-generate forms from command options
  autoForm: true,
  
  // Renderer options
  renderer: {
    fps: 30,
    mouseSupport: true,
    exitOnCtrlC: false
  },
  
  // Global keyboard shortcuts
  shortcuts: {
    'ctrl+c': () => process.exit(0),
    'ctrl+k': () => console.log('Command palette')
  }
})
```

## Custom TUI Components

Commands can provide custom TUI implementations:

```typescript
import { ContainerElement, Layout } from '@bunli/plugin-tui'

defineCommand({
  name: 'wizard',
  description: 'Installation wizard',
  
  // Custom TUI instead of auto-form
  tui: async ({ store, command, args }) => {
    const wizard = new InstallWizard()
    return wizard
  },
  
  handler: async ({ flags, context }) => {
    // Access TUI renderer if available
    if (context?.store.renderer) {
      const progress = new ProgressBar()
      context.store.renderer.add(progress)
      // ... update progress during execution
    }
  }
})
```

## Component Types

The plugin automatically maps Zod schemas to appropriate components:

| Zod Type | Component | Features |
|----------|-----------|-----------|
| `z.string()` | `Input` | Text input with validation |
| `z.boolean()` | `Checkbox` | Toggle with space/enter |
| `z.number()` | `NumberInput` | Numeric input with up/down arrows |
| `z.enum()` | `Select` | Dropdown with arrow navigation |

## Theming

### Built-in Themes

```typescript
tuiPlugin({ theme: 'dark' })  // Default
tuiPlugin({ theme: 'light' })
```

### Custom Theme

```typescript
tuiPlugin({
  theme: {
    name: 'custom',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#1e293b',
      foreground: '#f1f5f9',
      border: '#475569',
      focusBorder: '#3b82f6',
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
      inputBackground: '#0f172a',
      inputBorder: '#334155',
      buttonPrimary: '#3b82f6',
      buttonSecondary: '#64748b'
    }
  }
})
```

## Keyboard Navigation

- **Tab** / **Shift+Tab** - Navigate between fields
- **Enter** - Submit form / activate button
- **Escape** - Cancel form
- **Space** - Toggle checkbox / activate button
- **Arrow Keys** - Navigate select options, adjust numbers

## API Reference

### Components

#### Input
```typescript
import { Input } from '@bunli/plugin-tui'

const input = new Input({
  id: 'username',
  name: 'username',
  label: 'Username',
  placeholder: 'Enter username...',
  required: true,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9]+$'
})
```

#### Select
```typescript
import { Select } from '@bunli/plugin-tui'

const select = new Select({
  id: 'env',
  name: 'environment',
  label: 'Environment',
  options: [
    { label: 'Production', value: 'prod' },
    { label: 'Staging', value: 'staging' },
    { label: 'Development', value: 'dev' }
  ],
  defaultValue: 'dev'
})
```

#### Form
```typescript
import { Form } from '@bunli/plugin-tui'

const form = new Form({
  id: 'deploy-form',
  title: 'Deployment Configuration',
  description: 'Configure your deployment'
})

form.addField(input)
form.addField(select)

const values = await form.waitForSubmit()
```

## Examples

See the [examples](../../examples/tui-demo) directory for complete examples.

## License

MIT