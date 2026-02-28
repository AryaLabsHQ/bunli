# @bunli/tui

A React-based Terminal User Interface library for Bunli CLI framework, powered by OpenTUI's React renderer.

## Features

- **React-based Components**: Build TUIs using familiar React patterns and JSX
- **Component Library**: Form, layout, feedback, data-display, and chart components for alternate-buffer TUIs
- **OpenTUI Integration**: Full access to OpenTUI's React hooks and components
- **Type Safety**: Complete TypeScript support with proper type inference
- **Animation Support**: Built-in timeline system for smooth animations
- **Keyboard Handling**: Easy keyboard event management with `useKeyboard`
- **First-Class TUI Support**: TUI rendering is a first-class feature, not a plugin
- **Theme System**: Preset themes with token overrides via `ThemeProvider`/`createTheme`

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
- Mouse tracking is disabled by default (`useMouse: false`) to avoid leaking raw mouse escape sequences after exit in standard-buffer workflows. Enable explicitly when needed.

## Usage

### Module Split

Use subpath exports depending on mode:

- `@bunli/tui/prompt`: inline prompt runtime for standard-buffer command flows.
- `@bunli/tui/interactive`: alternate-buffer interactive components.
- `@bunli/tui/charts`: terminal-native chart primitives.
- `@bunli/tui`: root export that re-exports shared components/hooks.

### Clack Migration Quick Map

Use this when replacing a clack mental model with Bunli-native APIs:

```typescript
// clack
// import { intro, outro, confirm, select, multiselect, log } from '@clack/prompts'

// bunli
import { prompt } from '@bunli/tui/prompt'

prompt.intro('Setup')
const confirmed = await prompt.confirm('Continue?', { default: true })
const env = await prompt.select('Environment', {
  options: [
    { label: 'Development', value: 'dev' },
    { label: 'Production', value: 'prod' }
  ]
})
const features = await prompt.multiselect('Features', {
  options: [
    { label: 'Testing', value: 'testing' },
    { label: 'Docker', value: 'docker' }
  ],
  initialValues: ['testing']
})
prompt.log.success(`Selected ${env}`)
prompt.outro('Done')
```

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
import { SchemaForm } from '@bunli/tui'
import type { SelectOption } from '@opentui/core'
import { z } from 'zod'

const configSchema = z.object({
  apiUrl: z.string().url('Enter a valid URL'),
  region: z.enum(['us-east', 'us-west'])
})

function ConfigTUI() {
  const regions: SelectOption[] = [
    { name: 'US East', value: 'us-east', description: 'US East region' },
    { name: 'US West', value: 'us-west', description: 'US West region' }
  ]

  return (
    <SchemaForm
      title="Configure Settings"
      schema={configSchema}
      fields={[
        {
          kind: 'text',
          name: 'apiUrl',
          label: 'API URL',
          placeholder: 'https://api.example.com',
          required: true
        },
        {
          kind: 'select',
          name: 'region',
          label: 'Region',
          options: regions
        }
      ]}
      onSubmit={(values) => {
        console.log('Validated form values:', values)
      }}
      onCancel={() => process.exit(0)}
    />
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

Interactive components are available from `@bunli/tui/interactive` and root exports.

Included primitives:
- Form: `Form`, `SchemaForm`, `FormField`, `SelectField`
- Form v2: `NumberField`, `PasswordField`, `TextareaField`, `CheckboxField`, `MultiSelectField`
- Layout: `Container`, `Stack`, `Grid`, `Panel`, `Card`, `Divider`, `SectionHeader`
- Navigation/flow: `Tabs`, `Menu`, `CommandPalette`, `Modal`
- Dialog orchestration: `DialogProvider`, `useDialogManager`, `DialogDismissedError`
- Feedback: `Alert`, `Badge`, `Toast`, `ProgressBar`, `EmptyState`
- Data display: `List`, `Table`, `DataTable`, `KeyValueList`, `Stat`, `Markdown`, `Diff`
- Charts: `BarChart`, `LineChart`, `Sparkline` from `@bunli/tui/charts`
- Focus/keyboard scope: `FocusScopeProvider`, `useFocusScope`, `useScopedKeyboard`

### Keyboard Contracts

Default keyboard bindings for interactive primitives:

- `Modal`: `Esc` / `Ctrl+C` close, `Tab`/`Shift+Tab` focus trap
- `Dialog confirm`: `Left`/`h`/`y` -> confirm, `Right`/`l`/`n` -> cancel choice, `Tab` toggle, `Enter` submit
- `Dialog choose`: `Up`/`k` previous, `Down`/`j` next, `Enter` submit. Disabled options are skipped for selection/navigation.
- `Menu`: `Up`/`k`, `Down`/`j`, `Enter`
- `Tabs`: `Left`/`h` previous tab, `Right`/`l` next tab
- `CommandPalette`: `Up`/`k`, `Down`/`j`, `Enter`
- `DataTable`: `Left`/`h` previous sort column, `Right`/`l` next sort column, `Up`/`k` previous row, `Down`/`j` next row, `Enter` select row
- `Form`: `Tab`/`Shift+Tab` field navigation, `Ctrl+S` submit, `Ctrl+R` reset, `F8`/`Shift+F8` jump error fields, `Esc` cancel

### Dialog Manager

Use the dialog manager to stack confirm/choose flows with consistent priority handling and dismissal semantics.

```typescript
import { useDialogManager, DialogDismissedError } from '@bunli/tui/interactive'

function Screen() {
  const dialogs = useDialogManager()

  async function deploy() {
    try {
      const confirmed = await dialogs.confirm({
        title: 'Deploy',
        message: 'Ship this release now?'
      })
      if (!confirmed) return

      const target = await dialogs.choose({
        title: 'Target',
        options: [
          { label: 'Staging', value: 'staging', section: 'General' },
          { label: 'Production', value: 'production', section: 'Protected', disabled: true }
        ]
      })

      console.log('Deploying to', target)
    } catch (error) {
      if (error instanceof DialogDismissedError) {
        console.log('Dialog dismissed')
      }
    }
  }

  return <box />
}
```

### Form

A schema-driven container for controlled interactive forms.

```typescript
<Form 
  title="My Form"
  schema={schema}
  onSubmit={(values) => console.log(values)}
  onCancel={() => process.exit(0)}
>
  {/* Form fields */}
</Form>
```

**Props:**
- `title: string` - Form title
- `schema: StandardSchemaV1` - Validation schema (Zod and other Standard Schema adapters supported)
- `onSubmit: (values) => void | Promise<void>` - Submit handler with schema-validated values
- `onCancel?: () => void` - Cancel handler (optional)
- `onValidationError?: (errors: Record<string, string>) => void` - Validation error callback
- `initialValues?: Partial<InferOutput<schema>>` - Initial controlled values
- `validateOnChange?: boolean` - Validate while typing/selecting (default `true`)
- `submitHint?: string` - Footer hint override
- `onReset?: () => void` - Reset callback
- `onDirtyChange?: (isDirty, dirtyFields) => void` - Dirty-state callback
- `onSubmitStateChange?: ({ isSubmitting, isValidating }) => void` - async state callback
- `scopeId?: string` - keyboard scope boundary id for nested interactive flows

### SchemaForm

A higher-level schema form builder that renders fields from descriptors.

```typescript
<SchemaForm
  title="Deploy"
  schema={schema}
  fields={[
    { kind: 'text', name: 'service', label: 'Service' },
    { kind: 'select', name: 'env', label: 'Environment', options: envOptions },
    { kind: 'checkbox', name: 'telemetry', label: 'Enable telemetry' },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'Release notes',
      visibleWhen: (values) => values.env === 'production'
    }
  ]}
  onSubmit={(values) => console.log(values)}
/>
```

Supported `SchemaForm` field kinds:
- `text`
- `select`
- `multiselect`
- `number`
- `password`
- `textarea`
- `checkbox`

Field-level behavior:
- `visibleWhen(values) => boolean` for conditional rendering.
- `deriveDefault(values) => unknown` for dependent default initialization.

### FormField

A controlled text field bound to form context.

```typescript
<FormField
  label="Username"
  name="username"
  placeholder="Enter username"
  required
  defaultValue=""
/>
```

**Props:**
- `label: string` - Field label
- `name: string` - Field name
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Whether field is required
- `description?: string` - Helper text
- `defaultValue?: string` - Initial value for form state
- `onChange?: (value: string) => void` - Change handler
- `onSubmit?: (value: string) => void` - Submit handler

### SelectField

A controlled select field bound to form context.

```typescript
<SelectField
  label="Environment"
  name="env"
  options={[
    { name: 'Development', value: 'dev', description: 'Development environment' },
    { name: 'Production', value: 'prod', description: 'Production environment' }
  ]}
  defaultValue="dev"
  onChange={setEnvironment}
/>
```

**Props:**
- `label: string` - Field label
- `name: string` - Field name
- `options: SelectOption[]` - Available options
- `required?: boolean` - Whether field is required
- `description?: string` - Helper text
- `defaultValue?: SelectOption['value']` - Initial selected value
- `onChange?: (value: SelectOption['value']) => void` - Change handler

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

### Chart Primitives

`@bunli/tui/charts` supports negative and sparse values, axis labels, and multi-series palettes.

```typescript
import { BarChart, LineChart } from '@bunli/tui/charts'

<BarChart
  series={[
    { name: 'build', points: [{ label: 'Mon', value: -2 }, { label: 'Tue', value: 6 }] },
    { name: 'test', points: [{ label: 'Mon', value: null }, { label: 'Tue', value: 4 }] }
  ]}
  axis={{ yLabel: 'Jobs', xLabel: 'Day', showRange: true }}
/>

<LineChart
  series={{ name: 'latency', points: [{ value: 120 }, { value: 98 }, { value: null }, { value: 104 }] }}
  axis={{ yLabel: 'ms' }}
/>
```

### ThemeProvider and Tokens

Use `ThemeProvider` to apply a built-in theme preset or token overrides.

```typescript
import { ThemeProvider, createTheme } from '@bunli/tui/interactive'

const customTheme = createTheme({
  preset: 'dark',
  tokens: {
    accent: '#3ec7ff',
    textSuccess: '#3cd89b'
  }
})

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <Panel title="Deploy status">
        <Alert tone="success" message="Ready to ship" />
      </Panel>
    </ThemeProvider>
  )
}
```

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
