# @bunli/plugin-completions

Tab-powered shell completions for Bunli CLIs.

This plugin delegates script generation and the dynamic completion protocol (`complete -- <args>`) to `@bomb.sh/tab`, and builds Tab’s command tree from Bunli’s generated metadata (`.bunli/commands.gen.ts`).

## Install

```bash
bun add @bunli/plugin-completions
```

## Setup

```ts
import { defineConfig } from '@bunli/core'
import { completionsPlugin } from '@bunli/plugin-completions'

export default defineConfig({
  name: 'my-cli',
  plugins: [
    completionsPlugin({
      // generatedPath: '.bunli/commands.gen.ts',
      // commandName: 'my-cli',
      // executable: 'my-cli',
      // includeAliases: true,
      // includeGlobalFlags: true
    })
  ]
})
```

You must have `.bunli/commands.gen.ts` available (run `bunli generate`, or enable codegen in your build).

## Commands

### Generate a completion script

```bash
my-cli completions zsh
my-cli completions bash
my-cli completions fish
my-cli completions powershell
```

### Dynamic completion protocol callback (used by the shell scripts)

```bash
my-cli complete -- <args...>
```

Do not build your own integrations on Bunli’s parsed `positional` args for this path: Tab relies on a trailing empty-string sentinel (`''`) to detect “ends with space”, and Bunli’s parser drops empty strings. The implementation uses `runtime.args` directly.

## Shell Setup Examples

### Bash

```bash
source <(my-cli completions bash)
```

### Zsh

```bash
source <(my-cli completions zsh)
```

### Fish

```bash
my-cli completions fish > ~/.config/fish/completions/my-cli.fish
```

### PowerShell

```powershell
my-cli completions powershell | Out-String | Invoke-Expression
```

## Notes

### `@bomb.sh/tab` types workaround

As of `@bomb.sh/tab@0.0.13`, the published package references `dist/t.d.ts` but ships only `dist/t-<hash>.d.ts`. This package includes a `postinstall` script (`scripts/fix-tab-types.cjs`) that copies the hashed `.d.ts` to `dist/t.d.ts` when needed. It is a no-op once upstream fixes packaging.

For Bunli development in this monorepo, we also commit a Bun patch (see `patches/@bomb.sh%2Ftab@0.0.13.patch` and root `package.json` `patchedDependencies`) so `bun install` applies the fix in a git-friendly way.
