# Command Definition API

## defineCommand

Type helper for defining commands with proper type inference.

```typescript
import { defineCommand, option } from "@bunli/core"
import { z } from "zod"

export const myCommand = defineCommand({
  name: "mycommand",
  description: "My command description",
  alias: "mc", // optional: string or string[]
  options: {
    debug: option(z.boolean().default(false), { short: "d", description: "Debug output" })
  },
  handler: async ({ flags, prompt, spinner, signal }) => {
    if (signal.aborted) return
    if (flags.debug) prompt.log.info("Running...")
    const s = spinner("Work in progress...")
    s.succeed("Done")
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

Use `z.coerce.number()` for numeric flags because CLI args are strings.

```typescript
name: option(z.string(), { short: "n", description: "Your name" })
debug: option(z.boolean(), { short: "d", description: "Enable debug output" })
port: option(z.coerce.number(), { description: "Port number" })
mode: option(z.enum(["dev", "prod"]).default("dev"))
```

## Positional arguments

Read positionals from `handler` args:

```typescript
handler: ({ positional }) => {
  const [first, second, ...rest] = positional
}
```

## Runnable command shape

Runnable commands can provide:
- `handler` only (non-TUI flow)
- `render` only (TUI-only flow)
- both `handler` and `render` (dual mode)

Commands can also provide command-level renderer overrides:

```typescript
{
  tui: {
    renderer: {
      bufferMode: "standard"
    }
  }
}
```

## Handler context

```typescript
handler: ({ flags, positional, shell, env, cwd, prompt, spinner, colors, terminal, runtime, signal, context }) => {
  // flags: parsed option values
  // positional: positional arguments
  // shell: Bun.$
  // env: process.env
  // cwd: current working directory
  // prompt/spinner: @bunli/tui/prompt APIs
  // colors: @bunli/utils colors
  // terminal: width, height, isInteractive, isCI, supportsColor, supportsMouse
  // runtime: startTime, args, command
  // signal: cooperative cancellation signal
  // context: plugin command context (if plugins are loaded)
}
```
