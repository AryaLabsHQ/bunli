# Type Safety Patterns

## StandardSchema Integration

Bunli uses `@standard-schema/spec` for validation with full type inference.

```typescript
import { option } from "@bunli/core"
import { z } from "zod"

const opts = {
  name: option(z.string(), { description: "Your name" })
}

// TypeScript infers: { name: string }
type Flags = InferOptions<typeof opts>
```

## Generated Types

The `@bunli/generator` parses command files and generates TypeScript types.

```typescript
// .bunli/commands.gen.ts (auto-generated)
export interface RegisteredCommands {
  hello: Command<{ name: typeof nameOption }, {}, "hello">
}

// Type-safe command execution
cli.execute("hello", { name: "World" })
```

## Type Utilities

From `packages/core/src/utils/type-helpers.ts`:

```typescript
// Convert union to intersection
type T = UnionToIntersection<{ a: 1 } | { b: 2 }>
// → { a: 1 } & { b: 2 }

// Pick required properties
type T = PickRequired<{ a?: string; b: string }>
// → { b: string }

// Pick optional properties
type T = PickOptional<{ a?: string; b: string }>
// → { a?: string }
```

## Module Augmentation

Extend `RegisteredCommands` for type-safe CLI:

```typescript
// In your command file
declare module "@bunli/core" {
  interface RegisteredCommands {
    mycmd: typeof myCommand
  }
}
```

## Handler Type Inference

```typescript
type Handler<TFlags, TStore, TCommandName> =
  (args: HandlerArgs<TFlags, TStore, TCommandName>) => void | Promise<void>

interface HandlerArgs<TFlags, TStore, TCommandName> {
  flags: TFlags           // Inferred from options
  positional: string[]   // Positional arguments
  shell: Bun.$           // Bun shell
  env: typeof process.env
  cwd: string
  prompt: typeof import("@bunli/utils").prompt
  spinner: typeof import("@bunli/utils").spinner
  colors: typeof import("@bunli/utils").colors
  terminal: TerminalInfo
  runtime: RuntimeInfo
}
```
