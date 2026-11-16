# Relationship with Bunli

OpenTUI is the terminal rendering engine that powers **Bunli's** `@bunli/tui` package.

## When to use each:

| Use Case                                              | Skill                  |
| ----------------------------------------------------- | ---------------------- |
| Building a CLI with commands, options, subcommands    | **bunli**              |
| CLI plugin system (auth, config, completions)         | **bunli**              |
| Type-safe CLI with Zod validation                     | **bunli**              |
| Publishing CLI to npm                                 | **bunli**              |
| Basic TUI forms in CLI (Form, FormField, ProgressBar) | **bunli** (@bunli/tui) |
| Standalone terminal app (not a CLI)                   | **opentui**            |
| Advanced TUI animation (timeline, keyframes)          | **opentui**            |
| Full Flexbox/Yoga layout control                      | **opentui**            |
| Custom renderable components                          | **opentui**            |
| Terminal games or complex UIs                         | **opentui**            |

## How they connect:

```typescript
// Bunli uses OpenTUI internally
// @bunli/tui wraps @opentui/react

// In a Bunli CLI, you can access OpenTUI directly:
import { h, Box, Text, instantiate } from "@opentui/core";
import { createCliRenderer } from "@opentui/core";

// Bunli exports OpenTUI hooks for advanced use:
import { useTimeline, useKeyboard } from "@bunli/tui"; // re-exported from opentui
```

**Use bunli skill** for CLI development, then drop to **opentui skill** when you need custom
components or advanced rendering beyond what `@bunli/tui` provides.
