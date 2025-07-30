# Bunli TUI Demo

This example demonstrates the TUI (Terminal User Interface) capabilities of Bunli with the `@bunli/plugin-tui` package.

## Features Demonstrated

1. **Auto-Form Generation**: Automatically generates interactive forms from Zod schemas
2. **Multiple Input Types**: Shows various input components (text, select, number, boolean, array)
3. **Custom TUI**: Demonstrates how to build custom TUI interfaces
4. **Terminal Detection**: Shows terminal capabilities and adapts accordingly
5. **Global Flags**: Uses `--interactive` or `--tui` flags to enable TUI mode

## Commands

### `new` - Create New Project
Creates a new project with interactive configuration for:
- Project name and type
- Framework selection
- TypeScript, Git, and dependency options
- License selection

```bash
# Run in interactive mode
bun src/index.ts new --interactive

# Or use the shorthand
bun src/index.ts new -i
```

### `configure` - Configuration Settings
Configure application settings with various input types:
- URL validation
- API key input
- Enum selections
- Number inputs with min/max
- Boolean toggles
- Multi-select arrays

```bash
bun src/index.ts configure --tui
```

### `deploy` - Deployment Configuration
Deploy applications with comprehensive options:
- Environment selection
- Instance configuration
- Memory allocation
- Email notifications

```bash
bun src/index.ts deploy myapp --interactive
```

### `custom` - Custom TUI Demo
Shows how to create a completely custom TUI interface using OpenTUI components directly.

```bash
bun src/index.ts custom --tui
```

## Running the Example

1. Install dependencies:
```bash
bun install
```

2. Run any command with `--interactive` or `--tui` flag:
```bash
# Interactive new project
bun src/index.ts new --interactive

# Configure with TUI
bun src/index.ts configure --tui

# Deploy with specific options
bun src/index.ts deploy myapp -i -e production
```

## Non-Interactive Mode

All commands work in non-interactive mode too:

```bash
# Create project with all flags
bun src/index.ts new \
  --name my-project \
  --type library \
  --framework bun \
  --typescript \
  --git

# Configure with flags
bun src/index.ts configure \
  --apiUrl https://api.example.com \
  --apiKey secret123 \
  --region eu-west \
  --debug
```

## Terminal Capabilities

The example shows how Bunli detects and uses terminal capabilities:
- Terminal dimensions (width/height)
- Color support detection
- Mouse support detection
- CI environment detection

## Plugin Configuration

The TUI plugin is configured in `src/index.ts`:

```typescript
tuiPlugin({
  theme: 'dark',        // Theme selection
  autoForm: true,       // Auto-generate forms
  renderer: {
    fps: 60,           // Render FPS
    mouseSupport: true // Enable mouse
  }
})
```