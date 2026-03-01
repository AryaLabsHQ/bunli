# Project Scaffolding

## create-bunli

Initialize new Bunli CLI projects.

```bash
# Interactive
bunli init my-cli
bunx create-bunli my-cli

# With template
bunx create-bunli my-cli --template basic
bunx create-bunli my-cli --template advanced
bunx create-bunli my-cli --template monorepo

# Remote template
bunx create-bunli my-cli --template user/repo
bunx create-bunli my-cli --template github:user/repo

# Disable features via explicit booleans
bunx create-bunli my-cli --git=false --install=false
```

Current limitation:
- `file:` / `./` / `../` template inputs are detected as local, but current `create-bunli` flow rewrites local templates to bundled template paths. Treat local path templates as not reliably supported in this branch.

## create-bunli options

- `--template` template source
- `--dir` destination directory
- `--git` boolean (use `--git=false` to disable)
- `--install` boolean (use `--install=false` to disable)
- `--offline` prefer cached templates

`bunli init` also exposes `--package-manager`, but `create-bunli` currently installs with `bun install` regardless.

`bunli init` forwarding for disabling git/install currently uses `--no-git` / `--no-install`, which are ignored by `create-bunli` in this branch. Use `create-bunli --git=false --install=false` directly when needed.

## Templates

### basic

Simple CLI with one example command.

### advanced

CLI with multiple commands and richer examples.

### monorepo

Multi-package monorepo structure.

## Manual setup

```bash
npm init -y
bun add @bunli/core @bunli/utils @bunli/tui
bun add -d bunli typescript
mkdir -p src/commands
```

```typescript
// src/index.ts
import { createCLI } from "@bunli/core"
import { hello } from "./commands/hello.js"

const cli = await createCLI({
  name: "my-cli",
  version: "0.1.0"
})

cli.command(hello)
await cli.run()
```

`createCLI` returns a `Promise`, and commands are registered explicitly via `cli.command(...)`.

## Project structure

```text
my-cli/
├── cli.ts                # CLI entry point (or src/index.ts)
├── commands/             # Command definitions (or src/commands/)
│   ├── greet.ts
│   └── math.ts
├── bunli.config.ts
├── package.json
└── tsconfig.json
```
