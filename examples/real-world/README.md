# Real-World Example

This example demonstrates a realistic CLI setup with project automation commands, git utilities, and Docker tooling.

## Getting Started

```bash
bun install
bun run build
```

Run the CLI directly:

```bash
bun run dist/cli.js
```

## Generated Types

This project uses Bunli's generated helpers. After running `bunli generate` (or any CLI command that triggers codegen) you can import shared helpers from `./commands.gen.ts`:

```ts
import { cli, commands, commandMeta } from './commands.gen'

cli.register(await createCLI(...))
commands['git/sync'] // typed command reference
commandMeta['git/sync'] // runtime metadata (flags, descriptions)
```

`cli.execute` is also available when you call `cli.withCLI(existingCli)`.
