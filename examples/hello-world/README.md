# Hello World - Bunli CLI

The absolute simplest Bunli CLI example. Perfect for understanding the basics in under 30 seconds.

## Quick Start

```bash
# Install dependencies
bun install

# Run the CLI
bun cli.ts greet --name "World" --loud

# Or with short flags
bun cli.ts greet -n "Bunli" -l -t 3

# Force TUI mode (OpenTUI render path)
bun cli.ts greet --name "TUI" --tui

# Force non-TUI mode (handler path)
bun cli.ts greet --name "CLI" --no-tui
```

## What This Example Shows

- **Single command** with basic options
- **Schema validation** using Zod
- **Type coercion** (string → boolean, string → number)
- **Default values** and **short flags**
- **Colored output** with built-in utilities
- **OpenTUI integration** with `render` + global TUI flags

## The Command

```typescript
const greetCommand = defineCommand({
  name: 'greet' as const,
  description: 'A minimal greeting CLI',
  options: {
    name: option(z.string().default('world'), {
      short: 'n',
      description: 'Who to greet'
    }),
    loud: option(z.coerce.boolean().default(false), { 
      short: 'l', 
      description: 'Shout the greeting' 
    }),
    times: option(z.coerce.number().int().positive().default(1), { 
      short: 't', 
      description: 'Number of times to greet' 
    })
  },
  render: ({ flags }) => (
    <GreetProgress
      name={String(flags.name)}
      loud={Boolean(flags.loud)}
      times={Number(flags.times)}
    />
  ),
  handler: async ({ flags, colors }) => {
    const greeting = `Hello, ${flags.name}!`
    const message = flags.loud ? greeting.toUpperCase() : greeting
    
    for (let i = 0; i < flags.times; i++) {
      console.log(colors.cyan(message))
    }
  }
})
```

## Key Concepts

1. **`defineCommand`** - Creates a command with options and handler
2. **`option()`** - Wraps Zod schemas with CLI metadata (short flags, descriptions)
3. **Type coercion** - `z.coerce.boolean()` converts strings to booleans
4. **Dual execution path** - `render` for TUI, `handler` for non-TUI
5. **Handler context** - Access to `flags`, `colors`, `spinner`, etc.

## TUI Buffer Mode

This example configures:

```typescript
tui: {
  renderer: {
    bufferMode: 'standard'
  }
}
```

So `--tui` renders in the main terminal buffer (scrollback-friendly).

## Development

```bash
# Generate types (creates .bunli/commands.gen.ts)
bun run generate

# Start development with hot reload
bun run dev greet --name Developer

# Build for production
bun run build

# Run the built executable
./dist/cli greet --name "Production User" --loud
```

### Adding New Commands

To add a new command:

1. Create a new file in `commands/` (e.g., `commands/help.ts`)
2. Define the command using `defineCommand`
3. Export it as default
4. Import and register it in `cli.ts`
5. Run `bun run generate` to update types

## Next Steps

Ready for more? Try the **[task-runner](../task-runner/README.md)** example to learn about:
- Complex validation patterns
- Interactive prompts and wizards
- Progress indicators and spinners
- Real-world task automation

## Project Structure

```
hello-world/
├── cli.ts              # CLI entry point
├── commands/           # Command definitions
│   └── greet.tsx       # Greet command (handler + TUI render)
├── .bunli/            # Generated files (auto-created)
│   └── commands.gen.ts # Generated TypeScript types
├── bunli.config.ts     # Configuration
├── package.json        # Dependencies
└── README.md          # This file
```

That's it! This is the simplest possible Bunli CLI. Everything else builds on these concepts.
