# Minimal Bunli Example

This is the simplest possible Bunli CLI - a single command with schema-driven options.

## Features Demonstrated

- Basic CLI setup with `createCLI`
- Schema-driven options using Zod
- Simple option types (string, boolean, number)
- Using the `option()` helper for CLI metadata
- Color output with the built-in colors utility

## Usage

```bash
# Install dependencies
bun install

# Run the CLI
bun cli.ts greet

# With options
bun cli.ts greet --name Bunli --loud --times 3

# Using short flags
bun cli.ts greet -l -t 5

# Show help
bun cli.ts greet --help
```

## Key Concepts

1. **Schema-driven options**: Options are defined using Zod schemas, which handle validation and type coercion
2. **Direct schemas**: For simple cases, you can use schemas directly (like `name`)
3. **Option helper**: Use `option()` when you need CLI metadata like short flags or descriptions
4. **Type safety**: Full TypeScript inference from schemas - no manual type annotations needed