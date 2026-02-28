# Prompts

## Import

```typescript
import { prompt, confirm, select, multiselect, password } from "@bunli/utils"
```

## prompt

Text input with optional schema validation.

```typescript
// Basic
const name = await prompt("What is your name?")

// With options
const name = await prompt("Enter name", {
  default: "Anonymous",
  placeholder: "John Doe"
})

// With validation
const email = await prompt("Enter email", {
  schema: z.string().email(),
  validate: (value) => value.includes("@")
})
```

## confirm

Yes/no confirmation.

```typescript
const proceed = await confirm("Continue with installation?", {
  default: true
})
```

## select

Single selection from options.

```typescript
const framework = await select("Choose framework", {
  options: [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "svelte", label: "Svelte" }
  ],
  default: "react",
  hint: "Use arrow keys"
})
```

## multiselect

Multiple selection.

```typescript
const tools = await multiselect("Select tools", {
  options: [
    { value: "eslint", label: "ESLint" },
    { value: "prettier", label: "Prettier" },
    { value: "vitest", label: "Vitest" }
  ],
  min: 1,
  max: 3,
  initialValues: ["eslint"]
})
```

## password

Masked password input.

```typescript
const pwd = await password("Enter password", {
  validate: (value) => value.length >= 8
})
```

## Clack Prompts

Full access to `@clack/prompts`:

```typescript
import { clack } from "@bunli/utils"

clack.intro({ title: "My CLI" })
clack.outro("Done!")
clack.note("Info message", "Tip")
clack.log.info("Info")
clack.log.warn("Warning")
clack.log.error("Error")

const s = clack.spinner()
s.start("Loading...")
s.stop("Loaded!")
```

## Cancel Handling

```typescript
import { clack, prompt } from "@bunli/utils"

const value = await prompt("Enter value")

if (clack.isCancel(value)) {
  // Handle cancel
}

const safe = clack.assertNotCancelled(value)  // Throws if cancelled

const nextValue = await prompt("Enter value")
clack.promptOrExit(nextValue)  // Exits process on cancel
```
