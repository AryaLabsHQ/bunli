# @bunli/test

**CLI testing utilities for Bunli projects.**

## OVERVIEW

Provides `testCommand()` helper and assertion utilities for testing CLI commands.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Test utilities | `src/index.ts` |
| CLI test examples | `test/cli.test.ts` |

## PATTERNS

```typescript
import { testCommand } from '@bunli/test'

const result = await testCommand(myCommand, {
  flags: { verbose: true },
  args: ['file.txt']
})
expect(result.exitCode).toBe(0)
expect(result.stdout).toContain('output')
```

## EXPORTS

- `testCommand()` - Execute command with options
- Mock utilities for plugin stores
- Output capture helpers
