# TUI Components

## Overview

Bunli TUI provides React-based terminal UI components built on `@opentui/react`.
Use `registerTuiRenderer()` once at startup to enable `command.render`.

```typescript
import { registerTuiRenderer } from "@bunli/tui"

registerTuiRenderer()
```

## Core components

Common exports from `@bunli/tui` include:
- Form: `Form`, `SchemaForm`, `FormField`, `SelectField`, `MultiSelectField`, `NumberField`, `PasswordField`, `TextareaField`, `CheckboxField`
- Layout: `Container`, `Stack`, `Grid`, `Panel`, `Card`, `Divider`, `SectionHeader`
- Feedback and data: `Alert`, `Badge`, `Toast`, `ProgressBar`, `EmptyState`, `KeyValueList`, `Stat`, `DataTable`
- Navigation and overlays: `Tabs`, `Menu`, `CommandPalette`, `Modal`, `OverlayHostProvider`, `OverlayPortal`, `DialogProvider`, `useDialogManager`
- Theming and focus: `ThemeProvider`, `useTuiTheme`, `FocusScopeProvider`, `useFocusScope`, `useScopedKeyboard`

## Form

`Form` is schema-driven and validates via StandardSchema-compatible schemas.

```typescript
import { Form, FormField, SelectField } from "@bunli/tui"
import type { SelectOption } from "@opentui/core"
import { z } from "zod"

const schema = z.object({
  projectName: z.string().min(1),
  framework: z.enum(["react", "vue"])
})

const frameworkOptions: SelectOption[] = [
  { value: "react", name: "React" },
  { value: "vue", name: "Vue" }
]

<Form
  title="Setup Wizard"
  schema={schema}
  initialValues={{ framework: "react" }}
  onSubmit={(values) => console.log(values)}
  onCancel={() => console.log("cancelled")}
>
  <FormField label="Project name" name="projectName" required />
  <SelectField
    label="Framework"
    name="framework"
    options={frameworkOptions}
  />
</Form>
```

`Form` props:
- `title: string`
- `schema: StandardSchemaV1`
- `onSubmit: (values) => void | Promise<void>`
- `onCancel?: () => void`
- `onReset?: () => void`
- `onValidationError?: (errors) => void`
- `onDirtyChange?: (isDirty, dirtyFields) => void`
- `onSubmitStateChange?: (state) => void`
- `initialValues?: Partial<InferOutput<TSchema>>`
- `validateOnChange?: boolean`
- `submitHint?: string`
- `resetHint?: string`
- `scopeId?: string`

Fields are wired through form context and register by `name`.

## Field components

`FormField`:
- `label`, `name`
- `placeholder?`, `required?`, `description?`
- `defaultValue?`
- `onChange?`, `onSubmit?`

`SelectField`:
- `label`, `name`, `options`
- `required?`, `description?`
- `defaultValue?`
- `onChange?`

Use `SchemaForm` for schema-driven forms with explicit field variants.

`SchemaForm` requires:
- `schema`
- `fields: SchemaField[]` where each field has a `kind` (`text`, `select`, `multiselect`, `number`, `password`, `textarea`, `checkbox`)
- `onSubmit` and optional form props from `Form`

Advanced schema field helpers:
- `visibleWhen?: (values) => boolean`
- `deriveDefault?: (values) => unknown`

```typescript
import { SchemaForm } from "@bunli/tui"
import { z } from "zod"

const schema = z.object({
  plan: z.enum(["free", "pro"]),
  teamName: z.string().optional()
})

<SchemaForm
  title="Plan setup"
  schema={schema}
  fields={[
    {
      kind: "select",
      name: "plan",
      label: "Plan",
      options: [
        { value: "free", name: "Free" },
        { value: "pro", name: "Pro" }
      ]
    },
    {
      kind: "text",
      name: "teamName",
      label: "Team name",
      visibleWhen: (values) => values.plan === "pro"
    }
  ]}
  onSubmit={(values) => console.log(values)}
/>
```

## Hooks

```typescript
import { useKeyboard, useRenderer, useTerminalDimensions, useOnResize, useTimeline } from "@bunli/tui"
```

## Runtime exports

`@bunli/tui` also re-exports runtime providers and hooks from `@bunli/tui/runtime`:
- `AppRuntimeProvider`
- `RouteStoreProvider`, `useRouteStore`
- `CommandRegistryProvider`, `useCommandRegistry`, `useCommandRegistryItems`

Use these when building advanced command navigation/state orchestration on top of Bunli TUI.

## Renderer configuration

Global renderer options via `defineConfig`:

```typescript
import { defineConfig } from "@bunli/core"

export default defineConfig({
  tui: {
    renderer: {
      bufferMode: "alternate", // or "standard"
      exitOnCtrlC: true,
      targetFps: 30,
      enableMouseMovement: true,
      useMouse: false
    }
  }
})
```

Per-command overrides:

```typescript
import { defineCommand } from "@bunli/core"

export const logs = defineCommand({
  name: "logs",
  description: "Render in standard buffer",
  tui: {
    renderer: {
      bufferMode: "standard"
    }
  },
  render: () => <text content="Streaming logs..." />
})
```
