# @bunli/tui

A React-based Terminal User Interface library for Bunli CLI framework, powered by OpenTUI's React renderer.

## Features

- **React-based Components**: Build TUIs using familiar React patterns and JSX
- **Component Library**: Pre-built form components like `Form`, `FormField`, `SelectField`, and `ProgressBar`
- **OpenTUI Integration**: Full access to OpenTUI's React hooks and components
- **Type Safety**: Complete TypeScript support with proper type inference
- **Animation Support**: Built-in timeline system for smooth animations
- **Keyboard Handling**: Easy keyboard event management with `useKeyboard`
- **First-Class TUI Support**: TUI rendering is a first-class feature, not a plugin

## Installation

```bash
bun add @bunli/tui react
```

## Quick Start

```typescript
import { createCLI, defineCommand } from '@bunli/core'
import { registerTuiRenderer } from '@bunli/tui'

const cli = await createCLI({
  name: 'my-app',
  version: '1.0.0'
})

// Register TUI renderer to enable render() functions
registerTuiRenderer()

// Define a command with TUI using the render property
const myCommand = defineCommand({
  name: 'deploy',
  description: 'Deploy application',
  render: () => (
    <box title="Deployment" style={{ border: true, padding: 2 }}>
      <text>Deploying...</text>
    </box>
  ),
  handler: async () => {
    // CLI mode handler (used with --no-tui or in non-interactive environments)
    console.log('Deploying application...')
  }
})

cli.command(myCommand)
await cli.run()
```

## Buffer Modes (Alternate vs Standard)

OpenTUI can render using either the alternate screen buffer (full-screen TUI) or the standard terminal buffer (leaves output in scrollback).

Configure this in `createCLI()` config:

```typescript
const cli = await createCLI({
  name: 'my-app',
  version: '1.0.0',
  tui: {
    renderer: {
      bufferMode: 'alternate' // or 'standard'
    }
  }
})
```

Notes:
- `bufferMode: 'alternate'` is the default for interactive terminals.
- `bufferMode: 'standard'` is the default for non-interactive / CI environments when TUI is forced via `--tui`.

## Usage

### Basic TUI Component

```typescript
import { defineCommand } from '@bunli/core'

function MyTUI() {
  return (
    <box title="My App" style={{ border: true, padding: 2 }}>
      <text>Hello from My App!</text>
    </box>
  )
}

export const myCommand = defineCommand({
  name: 'my-command',
  description: 'My command with TUI',
  render: () => <MyTUI />,
  handler: async () => {
    console.log('Running my-command in CLI mode')
  }
})
```

### Using Form Components

```typescript
import { defineCommand } from '@bunli/core'
import { FormField, SelectField } from '@bunli/tui'
import type { SelectOption } from '@opentui/core'
import { useState } from 'react'

function ConfigTUI() {
  const [apiUrl, setApiUrl] = useState('')
  const [region, setRegion] = useState('us-east')

  const regions: SelectOption[] = [
    { name: 'US East', value: 'us-east', description: 'US East region' },
    { name: 'US West', value: 'us-west', description: 'US West region' }
  ]

  return (
    <box title="Configure Settings" border padding={2} style={{ flexDirection: 'column' }}>
      <FormField
        label="API URL"
        name="apiUrl"
        placeholder="https://api.example.com"
        required
        value={apiUrl}
        onChange={setApiUrl}
      />
      <SelectField
        label="Region"
        name="region"
        options={regions}
        onChange={setRegion}
      />
    </box>
  )
}

export const configureCommand = defineCommand({
  name: 'configure',
  description: 'Configure application settings',
  render: () => <ConfigTUI />
})
```

### Using OpenTUI Hooks

```typescript
import { useKeyboard, useTimeline, useTerminalDimensions } from '@bunli/tui'

function InteractiveTUI({ command }) {
  const [count, setCount] = useState(0)
  const { width, height } = useTerminalDimensions()
  
  const timeline = useTimeline({ duration: 2000 })
  
  useKeyboard((key) => {
    if (key.name === 'q') {
      process.exit(0)
    }
    if (key.name === 'space') {
      setCount(prev => prev + 1)
    }
  })
  
  useEffect(() => {
    timeline.add({ count: 0 }, {
      count: 100,
      duration: 2000,
      onUpdate: (anim) => setCount(anim.targets[0].count)
    })
  }, [])
  
  return (
    <box title="Interactive Demo" style={{ border: true, padding: 2 }}>
      <text>Count: {count}</text>
      <text>Terminal: {width}x{height}</text>
      <text>Press SPACE to increment, Q to quit</text>
    </box>
  )
}
```

## Component Library

### Form

A container component for building forms with keyboard navigation.

```typescript
<Form 
  title="My Form"
  onSubmit={(values) => console.log(values)}
  onCancel={() => process.exit(0)}
>
  {/* Form fields */}
</Form>
```

**Props:**
- `title: string` - Form title
- `onSubmit: (values: Record<string, any>) => void` - Submit handler
- `onCancel?: () => void` - Cancel handler (optional)

### FormField

A text input field with label and validation.

```typescript
<FormField
  label="Username"
  name="username"
  placeholder="Enter username"
  required
  value={username}
  onChange={setUsername}
  onSubmit={handleSubmit}
/>
```

**Props:**
- `label: string` - Field label
- `name: string` - Field name
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Whether field is required
- `value?: string` - Current value
- `onChange?: (value: string) => void` - Change handler
- `onSubmit?: (value: string) => void` - Submit handler

### SelectField

A dropdown selection field.

```typescript
<SelectField
  label="Environment"
  name="env"
  options={[
    { name: 'Development', value: 'dev', description: 'Development environment' },
    { name: 'Production', value: 'prod', description: 'Production environment' }
  ]}
  onChange={setEnvironment}
/>
```

**Props:**
- `label: string` - Field label
- `name: string` - Field name
- `options: SelectOption[]` - Available options
- `required?: boolean` - Whether field is required
- `onChange?: (value: string) => void` - Change handler

### ProgressBar

A progress bar component for showing completion status.

```typescript
<ProgressBar 
  value={75} 
  label="Upload Progress" 
  color="#00ff00" 
/>
```

**Props:**
- `value: number` - Progress value (0-100)
- `label?: string` - Progress label
- `color?: string` - Progress bar color

## OpenTUI Hooks

The plugin re-exports useful OpenTUI React hooks:

### useKeyboard

Handle keyboard events.

```typescript
import { useKeyboard } from '@bunli/tui'

useKeyboard((key) => {
  if (key.name === 'escape') {
    process.exit(0)
  }
})
```

### useRenderer

Access the OpenTUI renderer instance.

```typescript
import { useRenderer } from '@bunli/tui'

const renderer = useRenderer()
renderer.console.show()
```

### useTerminalDimensions

Get current terminal dimensions.

```typescript
import { useTerminalDimensions } from '@bunli/tui'

const { width, height } = useTerminalDimensions()
```

### useTimeline

Create and manage animations.

```typescript
import { useTimeline } from '@bunli/tui'

const timeline = useTimeline({ duration: 2000 })

timeline.add({ x: 0 }, {
  x: 100,
  duration: 2000,
  onUpdate: (anim) => setX(anim.targets[0].x)
})
```

### useOnResize

Handle terminal resize events.

```typescript
import { useOnResize } from '@bunli/tui'

useOnResize((width, height) => {
  console.log(`Terminal resized to ${width}x${height}`)
})
```

## Plugin Configuration

```typescript
import { tuiPlugin } from '@bunli/tui'

const plugin = tuiPlugin({
  renderer: {
    exitOnCtrlC: false,
    targetFps: 30,
    enableMouseMovement: true
  },
  theme: 'dark',
  autoForm: false
})
```

**Options:**
- `renderer?: CliRendererConfig` - OpenTUI renderer configuration
- `theme?: 'light' | 'dark' | ThemeConfig` - Theme configuration
- `autoForm?: boolean` - Enable auto-form generation (disabled for now)

## OpenTUI Components

You can use any OpenTUI React components directly:

```typescript
import { render } from '@opentui/react'

function MyComponent() {
  return (
    <box style={{ border: true, padding: 2 }}>
      <text>Hello World</text>
      <input placeholder="Type here..." />
      <select options={options} />
    </box>
  )
}
```

Available components:
- `<box>` - Container with borders and layout
- `<text>` - Text display with styling
- `<input>` - Text input field
- `<select>` - Dropdown selection
- `<scrollbox>` - Scrollable container
- `<ascii-font>` - ASCII art text
- `<tab-select>` - Tab-based selection

## Examples

See the `examples/tui-demo` directory for complete examples:

- **Deploy Command**: Animated progress bar with timeline
- **Configure Command**: Form with input and select fields

## TypeScript Support

The plugin provides full TypeScript support:

```typescript
import type { TuiComponent, TuiComponentProps } from '@bunli/tui'

const MyTUI: TuiComponent = ({ command, args, store }) => {
  // Fully typed props
  return <box>{command.name}</box>
}
```

## License

MIT
