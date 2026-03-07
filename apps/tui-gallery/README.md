# TUI Gallery

Terminal-native gallery app for Bunli UI components and runtime recipes.

## What it is

- A dedicated app under `apps/` for browsing `@bunli/tui` examples
- A replacement for the old `examples/hello-world` showcase command
- A place to inspect both component examples and runtime recipes

## Run it

```bash
cd apps/tui-gallery
bun install
bun run generate
bun run dev gallery
```

Or run directly:

```bash
bun cli.ts gallery
```

## Keyboard

- `F1`: focus sections
- `F2`: focus categories
- `F3`: focus entries
- `F4`: focus preview
- `F5`: focus states
- `Alt+T`: toggle theme
- `Alt+W`: cycle width preset
- `Ctrl+C`: quit
