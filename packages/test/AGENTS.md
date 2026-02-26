# @bunli/test

**Testing utilities for Bunli CLIs.**

## OVERVIEW

Provides testing helpers for CLI commands and full CLI testing.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main exports | `src/index.ts` |
| Command testing | `src/test-command.ts` |
| CLI testing | `src/test-cli.ts` |

## PATTERNS

```typescript
import { testCommand, expectCommand } from '@bunli/test'

// Test a single command
await testCommand(myCommand, {
  args: ['--flag', 'value'],
  expected: { output: '...' }
})

// Full CLI test
await testCLI({
  bin: 'bunli',
  args: ['build'],
  expected: { exitCode: 0 }
})
```
