# @bunli/utils

**Shared utilities: colors, prompts, spinners, validation.**

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Terminal colors | `src/colors.ts` |
| Spinner utility | `src/spinner.ts` |
| Interactive prompts | `src/prompt.ts` |
| Validation helpers | `src/validation.ts` |

## PATTERNS

- Use `colors.info()`, `colors.success()`, `colors.warn()`, `colors.error()`
- Spinner: `spinner('message').start()` → `.succeed()` or `.fail()`
- Prompt: `prompt.confirm()`, `prompt.select()`, `prompt.text()`
- Validation: Zod schemas in `src/validation.ts`

## DEPS

- `@clack/prompts` for UI components
- `consola` for logging
- `zod` for validation
