# Command Structure Example

This example demonstrates how to organize commands in a Bunli CLI application.

## Features Demonstrated

- Command manifest for lazy loading
- Nested command structure
- Command aliases (single and multiple)
- Inline subcommands
- Command groups

## Structure

```
commands/
├── index.ts          # Command manifest
├── init.ts          # Top-level command with single alias
├── deploy.ts        # Top-level command with multiple aliases  
├── config.ts        # Command group with inline subcommands
└── db/              # Nested commands
    ├── migrate.ts
    ├── seed.ts
    └── backup.ts
```

## Usage Examples

### Top-Level Commands

```bash
# Initialize a project (using alias)
bun cli.ts init --name my-project
bun cli.ts i -n my-project  # Using alias

# Deploy (multiple aliases)
bun cli.ts deploy --environment prod
bun cli.ts d -e staging     # Using alias 'd'
bun cli.ts ship -e dev      # Using alias 'ship'
```

### Nested Commands

```bash
# Database commands
bun cli.ts db migrate
bun cli.ts db migrate --direction down --steps 2
bun cli.ts db m -d up      # Using alias

bun cli.ts db seed --count 100 --table users
bun cli.ts db backup --output mybackup.sql
```

### Command Groups with Subcommands

```bash
# Config commands (inline subcommands)
bun cli.ts config list
bun cli.ts config ls        # Using alias
bun cli.ts config get api.url
bun cli.ts config set debug true
```

## Key Concepts

1. **Lazy Loading**: Commands are only loaded when needed
2. **Command Manifest**: Central place to define command structure
3. **Aliases**: Commands can have one or more short aliases
4. **Nested Structure**: Organize related commands together
5. **Inline Subcommands**: Define subcommands directly in parent

## Help System

The help system automatically works with nested commands:

```bash
# Root help
bun cli.ts --help

# Command help
bun cli.ts deploy --help

# Nested command help
bun cli.ts db migrate --help

# Command group help
bun cli.ts config --help
```