# bunli

The Bunli CLI toolchain for developing, building, and distributing CLI applications.

## Installation

```bash
bun add -g bunli
```

## Usage

### Development

Run your CLI in development mode with hot reloading and automatic type generation:

```bash
bunli dev

# With custom entry file
bunli dev --entry src/mycli.ts

# Enable debugging
bunli dev --inspect

# Custom debug port
bunli dev --inspect --port 9230

# Pass arguments to your CLI
bunli dev -- --help
```

Development options:
- `--entry, -e` - Entry file (defaults to auto-detect)
- `--watch, -w` - Watch for changes (default: true)
- `--inspect, -i` - Enable debugger
- `--port, -p` - Debugger port (default: 9229)
- `--generate` - Enable/disable code generation (default: true)
- `--clearScreen` - Clear screen on reload (default: true)

**Note:** Development mode automatically generates TypeScript definitions from your commands when codegen is enabled in your config.

### Building

Build your CLI for production with automatic type generation:

```bash
# Traditional build (requires Bun runtime)
bunli build

# Build standalone executables for specific platforms
bunli build --targets darwin-arm64,linux-x64

# Build for the current platform only
bunli build --targets native

# Build for all supported platforms
bunli build --targets all
```

**Note:** The build process automatically generates TypeScript definitions from your commands before building when codegen is enabled in your config.

### Type Generation

Generate TypeScript definitions from your CLI commands for enhanced developer experience:

```bash
# Generate types once
bunli generate

# Generate types and watch for changes
bunli generate --watch

# Explicit command discovery entry
bunli generate --entry ./src/cli.ts

# Optional fallback directory
bunli generate --directory ./src/commands

# Custom output file
bunli generate --output ./types/commands.gen.ts
```

Generate options:
- `--entry, -e` - CLI entry file used for command discovery
- `--directory` - Optional fallback command source directory
- `--output, -o` - Output file path (default: ./.bunli/commands.gen.ts)
- `--watch, -w` - Watch for changes and regenerate

The generator creates type-safe command definitions with:
- Autocomplete for command names and options
- Type safety at compile time
- IntelliSense for command metadata
- Helper functions for command discovery

### Available Commands

- `bunli init` - Initialize a new Bunli CLI project
- `bunli dev` - Run CLI in development mode with hot reloading
- `bunli build` - Build your CLI for production
- `bunli generate` - Generate TypeScript definitions from commands
- `bunli doctor completions` - Validate generated completion metadata
- `bunli test` - Run tests with Bun test runner
- `bunli release` - Release your CLI package

### Project Initialization

Create a new Bunli CLI project:

```bash
# Interactive setup
bunli init

# With project name
bunli init my-cli

# Advanced template
bunli init my-cli --template advanced

# Specify directory
bunli init --name my-cli --dir ./projects

# Skip git/install
bunli init --git false --install false
```

Init options:
- `--name, -n` - Project name
- `--template, -t` - Project template (basic/advanced/monorepo)
- `--dir, -d` - Directory to create project in
- `--git, -g` - Initialize git repository (default: true)
- `--install` - Install dependencies (default: true)
- `--package-manager, -p` - Package manager to use (bun/pnpm/yarn/npm)

### Testing

Run tests for your CLI:

```bash
# Run all tests
bunli test

# Watch mode
bunli test --watch

# Generate coverage
bunli test --coverage

# Run tests in all workspace packages
bunli test --all
```

Test options:
- `--pattern, -p` - Test file patterns
- `--watch, -w` - Watch for changes
- `--coverage, -c` - Generate coverage report
- `--bail, -b` - Stop on first failure
- `--timeout` - Test timeout in milliseconds
- `--all` - Run tests in all packages (workspace mode)

### Releasing

Create a release of your CLI:

```bash
# Interactive release
bunli release

# Specific version bump
bunli release --version patch
bunli release --version minor
bunli release --version major
bunli release --version 2.0.0

# Dry run
bunli release --dry

# Disable npm publish explicitly
bunli release --npm=false

# Create GitHub release entry
bunli release --github=true
```

Release options:
- `--version, -v` - Version to release (patch/minor/major/x.y.z)
- `--tag, -t` - Git tag format
- `--npm` - Publish to npm (`--npm=false` to disable)
- `--github` - Create GitHub release (`--github=true` to enable)
- `--dry, -d` - Dry run (runs npm publish with `--dry-run` when npm publish is enabled)
- `--all` - Workspace release mode (currently not implemented; exits with error)

Note: `bunli release` supports npm package release flows, including binary package distribution via `release.binary`
(`optionalDependencies` + shim launcher). For standalone GitHub release assets, checksums, and Homebrew automation,
use the `bunli-releaser` GitHub Action.

### Build Options

The `build` command supports several options:

- `--entry, -e` - Entry file (defaults to auto-detect)
- `--outdir, -o` - Output directory (default: ./dist)
- `--outfile` - Output filename (for single executable)
- `--targets, -t` - Target platforms for compilation (comma-separated)
- `--minify, -m` - Minify output (default: true)
- `--sourcemap, -s` - Generate sourcemaps
- `--bytecode` - Enable bytecode compilation (experimental)
- `--runtime, -r` - Runtime target for non-compiled builds (bun/node)
- `--watch, -w` - Watch for changes

### Standalone Executables

Bunli creates standalone executables when you specify target platforms. This bundles your CLI application with the Bun runtime into a single binary that can run without requiring Bun to be installed.

```bash
# Build for specific platforms
bunli build --targets darwin-arm64,linux-x64,windows-x64

# Build for current platform only
bunli build --targets native

# Build for all platforms
bunli build --targets all
```

Supported platforms:
- `darwin-arm64` - macOS Apple Silicon
- `darwin-x64` - macOS Intel
- `linux-arm64` - Linux ARM64
- `linux-x64` - Linux x64
- `windows-x64` - Windows x64

### Configuration

Create a `bunli.config.ts` file in your project root:

```typescript
import { defineConfig } from 'bunli'

export default defineConfig({
  name: 'my-cli',
  version: '1.0.0',

  commands: {
    entry: './src/cli.ts',
    directory: './src/commands' // optional fallback hint
  },
  
  build: {
    entry: './src/cli.ts',
    outdir: './dist',
    targets: ['darwin-arm64', 'linux-x64'],  // Compile for these platforms
    compress: true,  // Compress multi-platform builds
    minify: true,
    external: ['some-native-module']
  },
  
  dev: {
    watch: true,
    inspect: false
  }
})
```

### Build Behavior

The build system works as follows:

1. **No targets specified** → Traditional JavaScript build
   - Creates bundled `.js` files with shebangs
   - Requires Bun (or Node.js) runtime to execute
   - Supports multiple entry points

2. **Targets specified** → Standalone executables
   - Creates native binaries with embedded Bun runtime
   - No runtime dependencies required
   - Single entry point only
   - Platform-specific subdirectories for multiple targets

## Development

To work on Bunli itself:

```bash
# Install dependencies
bun install

# Run in development
bun run dev

# Build
bun run build

# Run tests
bun test
```

## License

MIT
