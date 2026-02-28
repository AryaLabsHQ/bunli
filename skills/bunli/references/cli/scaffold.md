# Project Scaffolding

## create-bunli

Initialize new Bunli CLI projects.

```bash
# Interactive
bunli init my-cli
create-bunli

# With template
create-bunli my-cli --template basic
create-bunli my-cli --template advanced
create-bunli my-cli --template monorepo
```

## Templates

### basic

Simple CLI with one example command.

```
my-cli/
├── src/
│   ├── commands/
│   │   └── hello.ts
│   └── index.ts
├── bunli.config.ts
├── package.json
└── tsconfig.json
```

### advanced

CLI with multiple commands.

```
my-cli/
├── src/
│   ├── commands/
│   │   ├── init.ts
│   │   ├── validate.ts
│   │   ├── serve.ts
│   │   └── config.ts
│   └── index.ts
├── bunli.config.ts
├── package.json
└── tsconfig.json
```

### monorepo

Multi-package monorepo structure.

```
my-cli/
├── packages/
│   ├── cli/
│   │   └── src/
│   ├── core/
│   │   └── src/
│   └── utils/
│       └── src/
├── bunli.config.ts
├── package.json
├── turbo.json
└── tsconfig.json
```

## Manual Setup

```bash
# Initialize npm project
npm init -y

# Install dependencies
bun add @bunli/core @bunli/utils @bunli/tui
bun add -d bunli typescript

# Create entry point
mkdir -p src/commands

# Create src/index.ts
import { createCLI } from "@bunli/core"
import helloCommand from "./commands/hello.js"

const cli = await createCLI({
  name: "my-cli",
  version: "0.1.0",
})

// Register commands
cli.command(helloCommand)

// Run CLI
await cli.run()
```

> **Important:** `createCLI` returns a `Promise`, and commands must be registered via `cli.command()` before calling `cli.run()`.

## Project Structure

```
my-cli/
├── cli.ts                 # CLI entry point (or src/index.ts)
├── commands/              # Command definitions (or src/commands/)
│   ├── greet.ts
│   └── math.ts
├── bunli.config.ts       # Configuration
├── package.json
└── tsconfig.json
```

Note: You can use `src/` prefix or place files at root level. The `bunli.config.ts` must specify the entry point path.
