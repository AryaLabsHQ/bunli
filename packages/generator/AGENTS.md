# @bunli/generator

**TypeScript type generation from CLI commands.**

## OVERVIEW

Creates `commands.gen.ts` with full type inference from command definitions in `commands/` directory.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Generator logic | `src/generator.ts` |
| Type templates | `src/templates/` |
| Command parsing | `src/parser.ts` |

## PATTERNS

- Scans `commands/` directory for `*.ts` files
- Extracts Zod option schemas
- Generates `commands.gen.ts` in `.bunli/` directory
- Uses Prettier for formatting

## DEPENDENCIES

- `typescript` - Compiler API
- `zod` - Schema parsing
- `prettier` - Code formatting
- `pathe` - Path utilities
