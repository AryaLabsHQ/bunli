---
name: bunli
description: "Build type-safe CLIs with Bun. Use when: (1) Creating a new CLI application with Bun, (2) Adding commands with defineCommand/option(), (3) Building a plugin system, (4) Using prompt/spinner APIs for interactive CLIs, (5) Building TUI components, (6) Publishing CLI to npm. For advanced TUI (custom components, animations, full layout control), use the 'opentui' skill. Covers: defineCommand, option() APIs, plugin architecture, bunli CLI commands (dev/build/generate/test/release/init/doctor), create-bunli scaffolding, and utilities."
---

# Bunli Skill

Build type-safe CLIs with Bun. See `references/` for detailed documentation.

## Quick Start

```bash
# Create new CLI
bunli init my-cli

# Or manually:
mkdir my-cli && cd my-cli
npm init -y
bun add @bunli/core @bunli/utils @bunli/tui
bun add -d bunli typescript
```

Then create your entry point:

```typescript
// cli.ts
import { createCLI } from "@bunli/core"
import { defineCommand, option } from "@bunli/core"
import { z } from "zod"

const hello = defineCommand({
  name: "hello",
  description: "Print a greeting",
  options: {
    name: option(z.string().default("World"), { short: "n", description: "Name to greet" }),
    count: option(z.coerce.number().default(1), { short: "c", description: "Number of times" })
  },
  handler: ({ flags, signal }) => {
    if (signal.aborted) return
    for (let i = 0; i < flags.count; i++) {
      console.log(`Hello, ${flags.name}!`)
    }
  }
})

const cli = await createCLI({
  name: "my-cli",
  version: "0.1.0",
})

cli.command(hello)
await cli.run()
```

Run with: `bun run cli.ts`

## Package Versions

Find current versions:
```bash
npm view @bunli/core      # Latest version
npm view @bunli/utils    # Latest version
npm view @bunli/tui      # Latest version
npm view bunli           # CLI version
```

## Quick Decision Trees

### "I need to define a command"

```
Define Command?
├─ Basic command → defineCommand({ name: "mycmd", description: "...", handler: ({ flags }) => {...} })
├─ With options → Add options: { options: { debug: option(z.boolean(), { short: "d" }) } }
├─ Nested commands → Use defineGroup({ name: "group", description: "...", commands: [...] })
├─ With alias → Add alias: "m" for "mycmd"
└─ With TUI → Add render (optionally keep handler; --no-tui disables alternate-buffer render, but explicit standard-buffer render may still run)
```

### "I need to add options"

```
Add Options?
├─ Boolean flag → option(z.boolean(), { short: "d", description: "Debug output" })
├─ String input → option(z.string(), { description: "Name" })
├─ Number input → option(z.coerce.number(), { description: "Port" })
├─ Enum/choice → option(z.enum(["dev", "prod"]), { description: "Environment" })
├─ With default → option(z.string().default("default"))
└─ Required → option(z.string().min(1))
```

> **Important**: Use `z.coerce.number()` for numeric flags because CLI args are strings. Enums should use `z.enum(...)`, and booleans can use `z.boolean()` (the parser handles `"true"`/`"false"`).
>
> `-v` is reserved globally for `--version`, so avoid `short: "v"` for command-local options.

### "I need to create a plugin"

```
Create Plugin?
├─ Direct plugin → createPlugin({ name: "my-plugin", setup(ctx) {...} })
├─ Factory → createPlugin((options) => ({ name: "my-plugin", ... }))
├─ With store → Add store: { counter: 0 }, access via context.store
└─ Lifecycle hooks → setup, configResolved, beforeCommand, afterCommand
```

### "I need to use prompts"

```
Use Prompt?
├─ Text input → prompt("Enter name")
├─ Yes/No → confirm("Continue?")
├─ Single choice → select("Select framework", { options: [...] })
├─ Multiple choice → multiselect("Select tools", { options: [...] })
└─ Password → password("Enter password")
```

### "I keep hitting validation errors"

```
Validation Errors?
├─ Numbers not working → Use z.coerce.number() instead of z.number()
├─ Booleans not working → Pass --flag=true/false (z.boolean() is supported)
├─ Enums not working → Use z.enum([...]), not z.coerce.enum(...)
├─ createCLI returns Promise → Use await createCLI() or .then()
└─ Commands not registering → Use cli.command(cmd), not commands: [cmd]
```

### "I need to build for production"

```
Build?
├─ Development → bunli dev (hot reload)
├─ Production build → bunli build
├─ Cross-compile → bunli build --targets darwin-arm64,linux-x64
├─ With bytecode → bunli build --bytecode
├─ Generate types → bunli generate
└─ Release → bunli release
```

### "I need advanced TUI (beyond basic forms)"

```
Advanced TUI?
├─ Custom components beyond Bunli's built-in form/layout set → Use opentui skill
├─ Advanced animations (timeline, keyframes) → Use opentui skill
├─ Full Flexbox layout control → Use opentui skill
├─ Custom renderables → Use opentui skill
└─ Just need Bunli components/forms/charts → Use @bunli/tui (covered here)
```

### "I need predictable TUI buffer behavior"

```
Buffer Mode?
├─ Global default policy → interactive + non-CI uses alternate; non-interactive/CI uses standard
├─ Force project-wide mode → set tui.renderer.bufferMode in defineConfig
├─ Per-command override → set command.tui.renderer.bufferMode
└─ --no-tui behavior → disables alternate-buffer render; explicit standard-buffer render may still run
```

## Product Index

### Core
| Topic | Reference |
|-------|-----------|
| Command definition | `references/core/commands.md` |
| Type safety patterns | `references/core/types.md` |

### Plugin System
| Topic | Reference |
|-------|-----------|
| Plugin architecture | `references/plugin/system.md` |
| Built-in plugins | `references/plugin/built-ins.md` |

### CLI Commands
| Topic | Reference |
|-------|-----------|
| CLI commands | `references/cli/commands.md` |
| Project scaffolding | `references/cli/scaffold.md` |

### Utilities
| Topic | Reference |
|-------|-----------|
| Prompts | `references/utils/prompts.md` |
| Spinners | `references/utils/spinner.md` |
| Colors | `references/utils/colors.md` |

### TUI
| Topic | Reference |
|-------|-----------|
| Components | `references/tui/components.md` |
| OpenTUI (advanced) | Use `opentui` skill |

### OpenTUI Integration
| Topic | Reference |
|-------|-----------|
| When to use OpenTUI | See "Relationship with OpenTUI" below |

## Core Concepts

### CLI Structure
```typescript
// my-cli/src/commands/hello.ts
import { defineCommand, option } from "@bunli/core"
import { z } from "zod"

export const hello = defineCommand({
  name: "hello",
  description: "Greet someone",
  options: {
    name: option(z.string().default("World"), {
      short: "n",
      description: "Name to greet"
    })
  },
  handler: ({ flags }) => {
    console.log(`Hello, ${flags.name}!`)
  }
})
```

### Plugin Creation
```typescript
import { createPlugin } from "@bunli/core/plugin"

const myPlugin = createPlugin({
  name: "my-plugin",
  store: { count: 0 },
  setup(context) {
    context.registerCommand(myCommand)
  },
  beforeCommand(ctx) {
    ctx.store.count++
  }
})
```

### Using Prompts
```typescript
import { prompt } from "@bunli/tui/prompt"

const name = await prompt("What is your name?")
const proceed = await prompt.confirm("Continue?")
const framework = await prompt.select("Choose framework", {
  options: [
    { label: "React", value: "react" },
    { label: "Vue", value: "vue" },
    { label: "Svelte", value: "svelte" }
  ]
})
```

## Key Packages

| Package | Purpose |
|---------|---------|
| `@bunli/core` | CLI framework (defineCommand, option, createCLI) |
| `@bunli/utils` | Colors and validation utilities |
| `@bunli/tui/prompt` | Prompt and spinner APIs |
| `@bunli/tui` | Terminal UI components |
| `bunli` | CLI for building CLIs |
| `create-bunli` | Project scaffolding |
| `@bunli/generator` | Type generation from commands |

## Built-in Plugins

- `@bunli/plugin-ai-detect` - Detects AI coding assistants
- `@bunli/plugin-completions` - Shell completions (bash, zsh, fish)
- `@bunli/plugin-config` - Config loading from multiple sources
- `@bunli/plugin-mcp` - MCP tools to CLI commands

## Relationship with OpenTUI

Bunli uses **OpenTUI** as its terminal rendering engine. Understanding when to use each:

### Use Bunli (this skill) for:
- Building CLI applications with commands and options
- Plugin architecture (auth, config, completions)
- Type-safe CLI with Zod validation
- Interactive prompts via `@bunli/tui/prompt`
- Bunli TUI components (`Form`, `SchemaForm`, `DataTable`, `ProgressBar`, and more)
- Publishing CLI to npm

### Use OpenTUI skill when:
- Building standalone terminal applications (not a CLI with subcommands)
- Need advanced animation with timeline, keyframes, easing functions
- Want full Flexbox/Yoga layout control
- Creating custom renderable components
- Need low-level buffer/terminal control
- Building terminal games or complex interactive UIs

### How They Connect

```typescript
// Bunli TUI uses OpenTUI under the hood
import { registerTuiRenderer } from "@bunli/tui"  // Sets up OpenTUI
import { Form, SchemaForm } from "@bunli/tui"      // Bunli's React components
import { prompt } from "@bunli/tui/prompt"         // Prompt + spinner runtime
import { useTimeline } from "@bunli/tui"          // Re-exported from opentui

// Drop down to OpenTUI for advanced control
import { h, Box, Text, instantiate } from "@opentui/core"
import { createCliRenderer } from "@opentui/core"
```

**Package relationship:**
- `@bunli/tui` wraps `@opentui/react`
- `registerTuiRenderer()` calls OpenTUI's `createCliRenderer()`
- `@bunli/tui/prompt` provides prompt + spinner APIs used in handlers
- Bunli TUI hooks (`useKeyboard`, `useTimeline`) are re-exported from OpenTUI
- Renderer options map to OpenTUI renderer settings

**When to combine:**
1. Start with Bunli for CLI structure
2. Use `@bunli/tui` for common patterns (forms, wizards)
3. Drop to OpenTUI when you need custom components, advanced animation, or full control
