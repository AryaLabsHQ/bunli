# Command Definition API

## defineCommand

Type helper for defining commands with proper type inference.

```typescript
import { defineCommand, option } from "@bunli/core"
import { z } from "zod"

export const myCommand = defineCommand({
  name: "mycommand",
  description: "My command description",
  alias: "mc", // Optional: string or string[]
  options: {
    // Define options here
  },
  handler: ({ flags, positional, shell, env, cwd, prompt, spinner, colors }) => {
    // Command implementation
  }
})
```

For nested command trees, use `defineGroup(...)`:

```typescript
import { defineGroup } from "@bunli/core"

export const adminGroup = defineGroup({
  name: "admin",
  description: "Admin commands",
  commands: [usersCommand, rolesCommand]
})
```

## option()

Creates a CLI option with StandardSchema validation.

> **Critical**: CLI arguments always arrive as strings. Use `z.coerce.number()` for numeric options. Use `z.enum(...)` for enums.
>
> - ❌ `z.number()` fails for "8080"
> - ✅ `z.coerce.number()` converts "8080" to 8080

```typescript
import { option } from "@bunli/core"
import { z } from "zod"

// Basic options
name: option(z.string(), { short: "n", description: "Your name" })
verbose: option(z.boolean(), { short: "v", description: "Enable verbose output" })
port: option(z.coerce.number(), { description: "Port number" })

// With defaults
timeout: option(z.coerce.number().default(5000))
mode: option(z.enum(["dev", "prod"]).default("dev"))

// With validation
email: option(z.string().email())
count: option(z.coerce.number().min(1).max(100))
```

## Positional Arguments

Positional arguments are handled via the `positional` array in HandlerArgs.

```typescript
handler: ({ flags, positional }) => {
  const [first, second, ...rest] = positional
}
```

## Command Interface

```typescript
interface RunnableCommand<TOptions, TStore, TName> {
  name: TName
  description: string
  options?: TOptions
  alias?: string | string[]
  handler: Handler<InferOptions<TOptions>, TStore, TName>
  // or render: RenderFunction<InferOptions<TOptions>, TStore>
}

interface Group<TStore, TName> {
  name: TName
  description: string
  alias?: string | string[]
  commands: Command<any, TStore, any>[]
}
```

## Handler Context

```typescript
handler: ({ flags, positional, shell, env, cwd, prompt, spinner, colors, terminal, runtime, context }) => {
  // flags: Parsed option values
  // positional: Array of positional arguments
  // shell: Bun.$ shell interface
  // env: Process environment variables
  // cwd: Current working directory
  // prompt: Prompt utilities
  // spinner: Spinner utilities
  // colors: Color formatting
  // terminal: Terminal info (width, height, isInteractive, isCI, supportsColor, supportsMouse)
  // runtime: Runtime info (startTime, args, command)
  // context: Plugin context for accessing store values
}
```
