# @bunli/plugin-completions

**Shell completions plugin - generates shell completion scripts.**

## OVERVIEW

Generates shell completion scripts for bash, zsh, fish, and powershell.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main plugin | `src/plugin.ts` |
| Completions command | `src/commands/completions.ts` |
| Metadata extraction | `src/utils/metadata.ts` |

## PATTERNS

```typescript
import { completionsPlugin } from '@bunli/plugin-completions'

plugins: [completionsPlugin()]
```

## SHELL TYPES

- `bash` - Bash completions
- `zsh` - Zsh completions
- `fish` - Fish completions
- `powershell` - PowerShell completions
