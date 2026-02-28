# CLI Commands

## Available Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `dev` | `d` | Run CLI in development mode with hot reload |
| `build` | `b` | Build CLI for production |
| `generate` | `gen` | Generate TypeScript types |
| `test` | `t` | Run tests with Bun |
| `release` | `r` | Create releases |
| `init` | `i` | Initialize new project |
| `doctor` | - | Run diagnostics for Bunli projects |

## bunli dev

Run CLI in development mode with hot reload.

```bash
bunli dev
bunli dev --watch
bunli dev --port 3000
```

Options:
- `--watch` - Watch for changes (boolean)
- `--port` - Debugger inspect port (`--inspect-port`)
- `--inspect` - Enable debugger

## bunli build

Build CLI for production.

```bash
bunli build
bunli build --targets darwin-arm64,linux-x64
bunli build --minify
bunli build --sourcemap
bunli build --bytecode  # Bytecode compilation
```

Options:
- `--targets` - Target platforms (darwin-arm64, darwin-x64, linux-arm64, linux-x64, windows-x64)
- `--outdir` - Output directory
- `--minify` - Minify output
- `--sourcemap` - Generate sourcemaps
- `--bytecode` - Compile to bytecode

## bunli generate

Generate TypeScript types from command definitions.

```bash
bunli generate
bunli generate --output .bunli/commands.gen.ts
```

Uses Babel AST parsing to extract command metadata.

## bunli test

Run tests with Bun.

```bash
bunli test
bunli test --coverage
bunli test --watch
bunli test --pattern "**/*.test.ts"
```

## bunli doctor

Run Bunli diagnostics.

```bash
bunli doctor completions
bunli doctor completions --generatedPath ./.bunli/commands.gen.ts
```

## bunli release

Create releases (npm publish + GitHub).

```bash
bunli release
bunli release --version patch
bunli release --npm
bunli release --github
```

## bunli init

Initialize new Bunli CLI project.

```bash
bunli init my-cli
create-bunli
```

## bunli.config.ts

```typescript
export default defineConfig({
  name: "mycli",
  version: "1.0.0",

  commands: {
    directory: "./commands"  // Optional: tooling/codegen discovery directory
  },

  build: {
    entry: "./cli.ts",
    outdir: "./dist",
    targets: ["darwin-arm64", "linux-x64"],
    minify: true,
    sourcemap: true
  },

  dev: {
    watch: true,
    port: 3000,
    inspect: true
  },

  test: {
    pattern: "**/*.test.ts",
    coverage: true
  },

  release: {
    npm: true,
    github: true,
    tagFormat: "v${version}"
  }
})
```
