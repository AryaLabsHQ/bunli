# TUI Components

## Overview

Bunli TUI provides React-based terminal UI components built on `@opentui/react`.

## Components

### Form

Container component for forms.

```typescript
import { Form } from "@bunli/tui"

<Form
  title="Setup Wizard"
  onSubmit={(values) => console.log(values)}
  onCancel={() => console.log("cancelled")}
>
  {/* Form fields */}
</Form>
```

Props:
- `title: string` - Form title
- `onSubmit: (values: Record<string, any>) => void` - Submit handler (current `Form` submits its own internal state map)
- `onCancel?: () => void` - Cancel handler
- `children: React.ReactNode` - Form content

Note: child fields are not auto-wired into `Form` state by name. Manage field state in the parent and pass what you need to `onSubmit`.

### FormField

Text input field.

```typescript
import { FormField } from "@bunli/tui"

<FormField
  label="Project Name"
  name="projectName"
  placeholder="my-project"
  required
  value={value}
  onChange={(value) => setValue(value)}
/>
```

Props:
- `label: string` - Field label
- `name: string` - Field name
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Required field
- `value?: string` - Initial value (uncontrolled after mount)
- `onChange?: (value: string) => void` - Change handler
- `onSubmit?: (value: string) => void` - Submit handler (Enter key)

### SelectField

Dropdown select.

```typescript
import { SelectField } from "@bunli/tui"

<SelectField
  label="Framework"
  name="framework"
  options={[
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" }
  ]}
  required
  onChange={(value) => setFramework(value)}
/>
```

Props:
- `label: string` - Field label
- `name: string` - Field name
- `options: SelectOption[]` - Options array
- `required?: boolean` - Required field
- `onChange?: (value: string) => void` - Change handler

### ProgressBar

Visual progress indicator.

```typescript
import { ProgressBar } from "@bunli/tui"

<ProgressBar
  value={75}
  label="Installing..."
  color="#00ff00"
/>
```

Props:
- `value: number` - Progress 0-100
- `label?: string` - Optional label
- `color?: string` - Bar color (default: #00ff00)

## Hooks

```typescript
import { useKeyboard, useRenderer, useTerminalDimensions, useOnResize, useTimeline } from "@bunli/tui"

// Keyboard handling
useKeyboard((key) => {
  if (key.name === "enter") handleSubmit()
})

// Terminal dimensions
const { rows, columns } = useTerminalDimensions()

// Resize handler
useOnResize(() => console.log("resized"))
```

## Renderer Setup

```typescript
import { registerTuiRenderer } from "@bunli/tui"

// Call once at app startup (takes no parameters)
registerTuiRenderer()
```

Renderer options are configured via `defineConfig({ tui: { renderer: ... } })`:

```typescript
import { defineCommand, defineConfig } from "@bunli/core"
import { Form, FormField } from "@bunli/tui"
import { registerTuiRenderer } from "@bunli/tui"

registerTuiRenderer()

export default defineConfig({
  tui: {
    renderer: {
      exitOnCtrlC: true,
      targetFps: 30,
      enableMouseMovement: true,
      bufferMode: 'alternate'
    }
  }
})

export const setup = defineCommand({
  name: 'setup',
  description: 'Setup wizard',
  render: () => (
    <Form title="Setup" onSubmit={(values) => console.log(values)}>
      <FormField label="Name" name="name" />
    </Form>
  )
})
```
