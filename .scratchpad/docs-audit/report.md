# Documentation Audit Report

**Date**: 2026-05-27
**Branch**: main (commit 52335c0)
**Scope**: Full audit — API Reference, Core Concepts, Packages, Guides, Examples
**Summary**: 3 critical, 6 high, 10 medium, 4 low

---

## Critical Findings (must fix)

### 1. [critical] `dev-server.mdx` — Documents non-existent `onError` plugin hook

- **Doc**: `apps/web/content/docs/examples/dev-server.mdx` lines 291-313
- **Source**: `packages/core/src/plugin/create.ts`
- **Issue**: Documentation shows an `onError` hook in the plugin lifecycle, but only `beforeCommand` and `afterCommand` exist
- **Evidence**: Plugin hooks are `beforeCommand` and `afterCommand`. No `onError` hook exists.
- **Fix**: Remove the `onError` hook example; replace with valid hooks only

### 2. [critical] `hello-world.mdx` — Documents non-existent `prompt.text/select/confirm/multiselect` methods

- **Doc**: `apps/web/content/docs/examples/hello-world.mdx` lines 142-166
- **Source**: `packages/runtime/src/prompt/index.ts`
- **Issue**: Docs show `prompt.text()`, `prompt.select()`, `prompt.multiselect()`, `prompt.confirm()` but only `prompt()` function exists
- **Evidence**: `packages/runtime/src/prompt/index.ts` only exports a single `prompt()` async function
- **Fix**: Replace with actual prompt API — just `prompt("question")` for text input

### 3. [critical] `define-config.mdx` — `loadConfig` documented but not listed as export

- **Doc**: `apps/web/content/docs/api/define-config.mdx` lines 304-306 (used in examples)
- **Source**: `packages/core/src/index.ts` exports `loadConfig` from `config-loader.ts`
- **Issue**: `loadConfig` is used in examples but not documented as an exported API
- **Evidence**: `loadConfig` exists and is exported but has no API documentation
- **Fix**: Add `loadConfig` to API index and document it, or remove from examples

---

## High Findings

### 4. [high] `plugin-mcp.mdx` — Missing exports: `toPascalCase`, `escapeString`, `generateUniqueVarName`

- **Doc**: `apps/web/content/docs/packages/plugins/mcp.mdx` lines 183-189
- **Source**: `packages/plugin-mcp/src/index.ts` lines 91-97
- **Issue**: Three naming utility functions are exported but not documented
- **Fix**: Add to "Naming Conventions" section

### 5. [high] `plugin-mcp.mdx` — Missing `namespace()` builder method documentation

- **Doc**: `apps/web/content/docs/packages/plugins/mcp.mdx` line 149
- **Source**: `packages/plugin-mcp/src/builder.ts`
- **Issue**: Example uses `.namespace("exa")` but method is not documented
- **Fix**: Document the builder API including `namespace()` method

### 6. [high] `create-cli.mdx` — Missing `generated` property in `BunliConfigInput`

- **Doc**: `apps/web/content/docs/api/create-cli.mdx` lines 34-63
- **Source**: `packages/core/src/cli.ts` line 144
- **Issue**: `generated?: string | boolean` is accepted but not documented
- **Fix**: Add `generated?: string | boolean;` to the config interface

### 7. [high] `define-config.mdx` — Missing `outdir` property in build config

- **Doc**: `apps/web/content/docs/api/define-config.mdx` lines 40-48
- **Source**: `packages/core/src/config.ts` line 65
- **Issue**: `outdir?: string` exists in schema but not documented
- **Fix**: Add `outdir?: string;` to build configuration section

### 8. [high] `api/index.mdx` — Broken link to non-existent `define-group`

- **Doc**: `apps/web/content/docs/api/index.mdx` line 14
- **Source**: No `define-group.mdx` file exists
- **Issue**: Links to `/docs/api/define-group` which doesn't exist; `defineGroup` is documented inside `define-command.mdx`
- **Fix**: Update link to point to `define-command` or create dedicated page

### 9. [high] `packages/meta.json` — Missing pages for `store`, `runtime`, `tui`

- **Doc**: `apps/web/content/docs/packages/meta.json`
- **Source**: Doc files `store.mdx`, `runtime.mdx`, `tui.mdx` exist but pages not listed in meta.json
- **Issue**: Navigation doesn't include these pages even though content exists
- **Fix**: Add `"store"`, `"runtime"`, `"tui"` to the pages array

---

## Medium Findings

### 10. [medium] `define-config.mdx` — Missing `workspace` configuration

- **Doc**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts` lines 105-113
- **Issue**: `workspace` property exists but is undocumented
- **Fix**: Add workspace configuration section

### 11. [medium] `define-config.mdx` — Missing `help` configuration

- **Doc**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts` lines 142-146
- **Issue**: `help.renderer` configuration is undocumented
- **Fix**: Add help configuration section

### 12. [medium] `define-config.mdx` — Missing `bufferMode` in TUI renderer config

- **Doc**: `apps/web/content/docs/api/define-config.mdx` lines 88-99
- **Source**: `packages/core/src/config.ts` lines 152-156
- **Issue**: `bufferMode?: "alternate" | "standard"` not documented
- **Fix**: Add `bufferMode` to TUI renderer section

### 13. [medium] `plugins.mdx` — Missing `createTestPlugin` and `composePlugins` utilities

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts` lines 93-160
- **Issue**: These plugin utilities are exported but not documented
- **Fix**: Add documentation for both utilities

### 14. [medium] `plugins.mdx` — Missing `ExecutionState` class

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/types.ts` lines 18-36
- **Issue**: `ExecutionState` is used by `preRun`/`postRun` hooks but not documented
- **Fix**: Document `ExecutionState` class

### 15. [medium] `runtime.mdx` — Missing `@bunli/runtime/image` subpath export

- **Doc**: `apps/web/content/docs/packages/runtime.mdx` lines 23-36
- **Source**: `packages/runtime/src/image/index.ts` exports `detectImageCapability`, `renderImage`
- **Issue**: The subpath export table doesn't include `./image`
- **Fix**: Add `@bunli/runtime/image` to subpath exports table

### 16. [medium] `plugin-skills.mdx` — Missing `builtinAgents` and `detectAgents` exports

- **Doc**: `apps/web/content/docs/packages/plugins/skills.mdx`
- **Source**: `packages/plugin-skills/src/index.ts` line 4
- **Issue**: These agent utilities are exported but not documented
- **Fix**: Add section on programmatic agent detection

### 17. [medium] `cli.mdx` — `@bunli/cli` package exports undocumented

- **Doc**: `apps/web/content/docs/packages/cli.mdx`
- **Source**: `packages/cli/src/index.ts`
- **Issue**: The package re-exports from core and exports `findEntry`, `version` — all undocumented
- **Fix**: Add API reference section for CLI package exports

### 18. [medium] `building-your-first-cli.mdx` — Broken link to non-existent `todo-cli`

- **Doc**: `apps/web/content/docs/guides/building-your-first-cli.mdx` lines 413-415
- **Source**: No `examples/todo-cli` directory
- **Issue**: Links to an example that doesn't exist
- **Fix**: Remove or update reference to actual example

### 19. [medium] `testing.mdx` — `context.store` direct access pattern vs type guards

- **Doc**: `apps/web/content/docs/guides/testing.mdx` lines 498-512
- **Source**: Actual implementation uses type guards like `hasMetricsStore`
- **Issue**: Docs show direct property access pattern that doesn't match implementation
- **Fix**: Update to show type guard pattern

---

## Low Findings

### 20. [low] `type-generation.mdx` — Non-existent `findCommandByName`/`findCommandsByDescription`

- **Doc**: `apps/web/content/docs/guides/type-generation.mdx` lines 86-87
- **Source**: Not exported from `packages/generator/src/`
- **Issue**: Documents functions that don't exist
- **Fix**: Remove references to these functions

### 21. [low] `plugins.mdx` — Missing `InferPluginOptions` and `InferPluginStore` type utilities

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts` lines 64-75
- **Issue**: Type utilities for inferring plugin types are undocumented
- **Fix**: Add type utility documentation

### 22. [low] `api/meta.json` — Missing `loadConfig` in pages list

- **Doc**: `apps/web/content/docs/api/meta.json`
- **Source**: `loadConfig` is used in examples but not in nav
- **Issue**: The function should be documented and listed
- **Fix**: Either document `loadConfig` or remove from examples

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| critical | 3 |
| high | 6 |
| medium | 10 |
| low | 4 |
| **Total** | **23** |

---

## Correctly Documented ✅

| Area | Status |
|------|--------|
| `@bunli/core` exports (defineCommand, createCLI, plugin system) | ✅ Accurate |
| `@bunli/utils` | ✅ Accurate |
| `@bunli/test` | ✅ Accurate |
| `@bunli/generator` | ✅ Accurate |
| `create-bunli` | ✅ Accurate |
| `@bunli/store` | ✅ Accurate |
| `@bunli/tui` | ✅ Accurate |
| `@bunli/plugin-config` | ✅ Accurate |
| `@bunli/plugin-ai-detect` | ✅ Accurate |
| `@bunli/plugin-completions` | ✅ Accurate |