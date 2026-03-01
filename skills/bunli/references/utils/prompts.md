# Prompts

## Import

```typescript
import {
  prompt,
  PromptCancelledError,
  isCancel,
  assertNotCancelled,
  promptOrExit
} from "@bunli/tui/prompt"
```

In command handlers, prefer injected prompt utilities:

```typescript
handler: async ({ prompt }) => {
  const name = await prompt("Project name")
}
```

## prompt / text

Text input with optional schema/validation.

```typescript
const name = await prompt("What is your name?")

const email = await prompt("Email", {
  schema: z.string().email(),
  placeholder: "name@example.com",
  fallbackValue: "ci@example.com"
})
```

Options:
- `default?: string`
- `placeholder?: string`
- `validate?: (input: string) => boolean | string`
- `schema?: StandardSchemaV1`
- `mode?: "inline" | "interactive"`
- `fallbackValue?: string`

Note: `PromptOptions` includes `multiline?: boolean` in types, but current runtime does not wire multiline behavior yet.

## confirm

```typescript
const proceed = await prompt.confirm("Continue with release?", {
  default: true,
  fallbackValue: false
})
```

Options:
- `default?: boolean`
- `mode?: "inline" | "interactive"`
- `fallbackValue?: boolean`

## select

```typescript
const framework = await prompt.select("Choose framework", {
  options: [
    { value: "react", label: "React", hint: "Most common" },
    { value: "vue", label: "Vue" }
  ],
  default: "react",
  fallbackValue: "react"
})
```

Options:
- `options: Array<{ label: string; value: T; hint?: string; disabled?: boolean }>`
- `default?: T`
- `hint?: string`
- `mode?: "inline" | "interactive"`
- `fallbackValue?: T`

## multiselect

```typescript
const tools = await prompt.multiselect("Select tools", {
  options: [
    { value: "eslint", label: "ESLint" },
    { value: "prettier", label: "Prettier" },
    { value: "vitest", label: "Vitest" }
  ],
  min: 1,
  max: 3,
  initialValues: ["eslint"],
  fallbackValue: ["eslint"]
})
```

Options:
- `options: Array<{ label: string; value: T; hint?: string; disabled?: boolean }>`
- `min?: number`
- `max?: number`
- `initialValues?: T[]`
- `mode?: "inline" | "interactive"`
- `fallbackValue?: T[]`

## password

```typescript
const token = await prompt.password("API token", {
  validate: (value) => value.length >= 20 || "Token is too short",
  fallbackValue: process.env.API_TOKEN ?? ""
})
```

Uses the same options as text prompt, including `mode` and `fallbackValue`.

## Prompt UI helpers

```typescript
prompt.intro("Setup")
prompt.note("Choose defaults to continue quickly", "Tip")
prompt.log.info("Starting checks...")
prompt.log.success("Checks passed")
prompt.cancel("Cancelled by user")
prompt.outro("Done")
```

Use grouped prompt flows:

```typescript
const result = await prompt.group({
  name: () => prompt("Project name"),
  packageManager: () =>
    prompt.select("Package manager", {
      options: [
        { label: "bun", value: "bun" },
        { label: "pnpm", value: "pnpm" }
      ]
    })
})
```

## Cancel handling

High-level prompt methods throw `PromptCancelledError` on cancellation.

```typescript
try {
  const value = await prompt("Enter value")
  // use value
} catch (error) {
  if (error instanceof PromptCancelledError) {
    // Handle user cancellation
  } else {
    throw error
  }
}
```

Helpers for low-level/sentinel flows:

```typescript
if (isCancel(value)) {
  // Handle cancel sentinel
}

const safeValue = assertNotCancelled(value)
const valueOrExit = promptOrExit(value, "Cancelled")
```
