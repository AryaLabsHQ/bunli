# @bunli/plugin-config

**Config merger plugin - loads and merges configuration from multiple sources.**

## OVERVIEW

Loads configuration from JSON files and merges them into the CLI config.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main plugin | `src/index.ts` |

## PATTERNS

```typescript
import { configMergerPlugin } from '@bunli/plugin-config'

plugins: [configMergerPlugin({
  sources: ['./config.json'],
  mergeStrategy: 'deep'
})]
```

## DEFAULT SOURCES

Template: `{{name}}` replaced with CLI name

- `~/.config/{{name}}/config.json`
- `.{{name}}rc`
- `.{{name}}rc.json`
