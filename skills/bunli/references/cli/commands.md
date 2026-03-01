# CLI Commands

## Available commands

| Command | Alias | Description |
|---------|-------|-------------|
| `dev` | `d` | Run CLI in development mode with hot reload |
| `build` | `b` | Build CLI for production |
| `generate` | `gen` | Generate TypeScript command types |
| `test` | `t` | Run tests with Bun |
| `release` | `r` | Create releases |
| `init` | `i` | Initialize a new project |
| `doctor` | - | Run diagnostics (`doctor completions`) |

## bunli dev

```bash
bunli dev
bunli dev --entry ./cli.ts --watch --inspect --port 3001
```

Options:
- `--entry` entry file
- `--generate` enable codegen (default `true`)
- `--clearScreen` accepted flag (currently not applied in runtime behavior)
- `--watch` watch for changes (default `true`)
- `--inspect` enable debugger
- `--port` debugger port

Behavior note:
- parser defaults populate `watch`/`inspect` flags, so config fallback for these is effectively shadowed unless flags are explicitly provided.

## bunli build

```bash
bunli build
bunli build --targets darwin-arm64,linux-x64 --bytecode
```

Options:
- `--entry` entry file
- `--outdir` output directory
- `--outfile` output filename (single executable)
- `--runtime` runtime target for non-compiled builds (`bun` or `node`)
- `--targets` compile targets (`native`, `all`, or explicit list)
- `--watch` accepted by command (currently not applied)
- `--minify`
- `--sourcemap`
- `--bytecode`

Compile caveat:
- when `--targets` is set (compiled mode), multi-entry `build.entry` arrays are not supported.

## bunli generate

```bash
bunli generate
bunli generate --entry ./cli.ts --directory ./commands --output ./.bunli/commands.gen.ts
bunli generate --watch
```

Options:
- `--entry` CLI entry file used for command discovery
- `--directory` optional command source directory fallback
- `--output` output path (default `./.bunli/commands.gen.ts`)
- `--watch` watch mode

## bunli test

```bash
bunli test
bunli test --pattern "**/*.test.ts" --coverage
bunli test --all --bail --timeout 30000
```

Options:
- `--pattern` test pattern(s)
- `--watch`
- `--coverage`
- `--bail` stop on first failure
- `--timeout` timeout in milliseconds
- `--all` run tests across workspace packages

## bunli doctor

```bash
bunli doctor completions
bunli doctor completions --generatedPath ./.bunli/commands.gen.ts
bunli doctor completions --strict
```

## bunli release

```bash
bunli release
bunli release --version patch --npm --github
bunli release --dry
```

Options:
- `--version` (`patch` | `minor` | `major` | explicit version)
- `--tag` custom git tag format
- `--npm` publish to npm
- `--github` create GitHub release
- `--dry` dry run
- `--all` workspace release (currently not implemented)

Behavior notes:
- defaults resolve from config: `npm=true`, `github=false`, `tagFormat="v{{version}}"` unless overridden.
- `--no-npm` and `--no-github` are treated as unsupported; use `--npm=false` / `--github=false` instead.

## bunli init

```bash
bunli init my-cli
bunli init --name my-cli --template advanced --dir ./apps/my-cli
```

Options:
- `--name` project name
- `--template` (`basic` | `advanced` | `monorepo`)
- `--dir` target directory
- `--git` boolean flag (disable forwarding is currently unreliable in `bunli init`)
- `--install` boolean flag (disable forwarding is currently unreliable in `bunli init`)
- `--package-manager` (`bun` | `pnpm` | `yarn` | `npm`) is forwarded by `bunli init`, but currently not consumed by `create-bunli` install flow

If you need reliable disable behavior today, call `create-bunli` directly:
`bunx create-bunli my-cli --git=false --install=false`.

## bunli.config.ts

```typescript
import { defineConfig } from "@bunli/core"

export default defineConfig({
  name: "mycli",
  version: "1.0.0",

  commands: {
    entry: "./cli.ts",
    directory: "./commands"
  },

  build: {
    entry: "./cli.ts",
    outdir: "./dist",
    targets: ["darwin-arm64", "linux-x64"],
    compress: false,
    external: ["fsevents"],
    minify: true,
    sourcemap: true
  },

  dev: {
    watch: true,
    inspect: false
  },

  test: {
    pattern: ["**/*.test.ts", "**/*.spec.ts"],
    coverage: false,
    watch: false
  },

  release: {
    npm: true,
    github: false,
    tagFormat: "v{{version}}"
  }
})
```
