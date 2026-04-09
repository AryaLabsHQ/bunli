# @bunli/utils

**Utility functions for Bunli CLIs.**

## OVERVIEW

Provides colors, validation, shell I/O, and logging utilities.

## WHERE TO LOOK

| Task         | Location                   |
| ------------ | -------------------------- |
| Main exports | `src/index.ts`             |
| Colors       | `src/colors.ts`            |
| Validation   | `src/validation.ts`        |
| Shell I/O    | `src/shell-integration.ts` |
| Logging      | `src/log.ts`               |

## EXPORTS

- `colors` - Terminal colors
- `validate*` - Validation utilities
- `readStdinLines` / `writeStdout*` - Shell-friendly stdin/stdout helpers
- `formatLog` / `log` - Structured stderr formatting helpers
