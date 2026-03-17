# create-bunli

**Project scaffolding CLI - creates new Bunli CLI projects from templates.**

## OVERVIEW

Interactive CLI for scaffolding new Bunli projects.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main entry | `src/cli.ts` |
| Project creation | `src/create.ts` |
| Template engine | `src/template-engine.ts` |

## TEMPLATES

| Template | Description |
|----------|-------------|
| `basic` | Minimal CLI with one command |
| `advanced` | CLI with multiple commands, config, validation |
| `monorepo` | Multi-package Turborepo setup |

## TEMPLATE VARIABLES

Variables in templates using `{{variableName}}`:
- `name`, `description`, `author`, `version`
