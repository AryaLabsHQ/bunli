# @bunli/plugin-completions

**Shell completions plugin - generates shell completion scripts.**

## OVERVIEW

Generates shell completion scripts for bash, zsh, and fish.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main plugin | `src/plugin.ts` |
| Completions command | `src/commands/completions.ts` |
| Metadata extraction | `src/utils/metadata.ts` |

## PATTERNS

```typescript
import { completionsPlugin } from '@bunli/plugin-completions'

plugins: [completionsPlugin({ shell: 'zsh' })]
```

## SHELL TYPES

- `bash` - Bash completions
- `zsh` - Zsh completions
- `fish` - Fish completions
