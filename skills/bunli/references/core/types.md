# Type Safety Patterns

## StandardSchema integration

Bunli uses `@standard-schema/spec` for validation with full type inference.

```typescript
import { option } from "@bunli/core"
import { z } from "zod"

const opts = {
  name: option(z.string(), { description: "Your name" })
}

// Option schemas are inferred into handler `flags` types automatically.
```

## Generated types

`@bunli/generator` parses command files and generates TypeScript types.

```typescript
// .bunli/commands.gen.ts (auto-generated)
export interface RegisteredCommands {
  hello: Command<{ name: typeof nameOption }, {}, "hello">
}

// Type-safe execution
cli.execute("hello", { name: "World" })
```

## Module augmentation

```typescript
declare module "@bunli/core" {
  interface RegisteredCommands {
    mycmd: typeof myCommand
  }
}
```

## Handler type inference

```typescript
type Handler<TFlags, TStore, TCommandName> =
  (args: HandlerArgs<TFlags, TStore, TCommandName>) => void | Promise<void>

interface HandlerArgs<TFlags, TStore, TCommandName> {
  flags: TFlags
  positional: string[]
  shell: typeof Bun.$
  env: typeof process.env
  cwd: string
  prompt: typeof import("@bunli/tui/prompt").prompt
  spinner: typeof import("@bunli/tui/prompt").spinner
  colors: typeof import("@bunli/utils").colors
  terminal: TerminalInfo
  runtime: RuntimeInfo
  signal: AbortSignal
  context?: import("@bunli/core/plugin").CommandContext<Record<string, unknown>>
}
```
