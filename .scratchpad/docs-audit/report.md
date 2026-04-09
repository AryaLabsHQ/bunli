# Documentation Audit Report

**Date**: 2026-04-01
**Scope**: Full audit of all documentation vs implementation
**Summary**: 6 critical, 8 high, 5 medium, 3 low

## Findings by Severity

---

### [CRITICAL] `create-cli.mdx` - `execute()` signature mismatch

- **File**: `apps/web/content/docs/api/create-cli.mdx`
- **Source**: `packages/core/src/cli.ts:1102-1156`
- **Issue**: Docs show 3 overloads for `execute()`, but implementation uses single method with union types
- **Evidence**:
  - Doc (lines 85-95): Three distinct overloads with typed `CommandOptions<T>`
  - Code: `async execute(commandName: string, argsOrOptions?: string[] | Record<string, unknown>, options?: Record<string, unknown>)`
- **Fix**: Update docs to match actual signature or clarify this is a types-only view

---

### [CRITICAL] `define-config.mdx` - `commands.entry` type wrong

- **File**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts:36-40`
- **Issue**: `commands.entry` documented as `string | string[]` but code only allows `string`
- **Evidence**: `z.object({ entry: z.string().optional() })` — no array support
- **Fix**: Change type to just `string`

---

### [CRITICAL] `define-config.mdx` - Missing `build.external` property

- **File**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts:71`
- **Issue**: `build.external` property exists but not documented
- **Evidence**: `external: z.array(z.string()).optional()` in build schema
- **Fix**: Add `external?: string[]` to build config documentation

---

### [CRITICAL] `define-config.mdx` - Missing default values

- **File**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts`
- **Issue**: Default values not documented for multiple properties
- **Missing defaults**:
  - `dev.watch: true` (line 82)
  - `dev.inspect: false` (line 83)
  - `release.binary.packageNameFormat: '{{name}}-{{platform}}'` (line 121)
  - `release.binary.shimPath: 'bin/run.mjs'` (line 122)
- **Fix**: Document these defaults

---

### [CRITICAL] `define-command.mdx` - Missing prompt API methods

- **File**: `apps/web/content/docs/api/define-command.mdx`
- **Source**: `packages/runtime/src/prompt/index.ts:2292-2309`
- **Issue**: Many prompt methods not documented
- **Missing methods**:
  - `filter()` - line 2330
  - `group()` - line 2408
  - `intro`, `outro`, `note`, `log`, `cancel`, `isCancel` - lines 2332-2337
  - Default call signature `prompt(message)` - line 2292
- **Fix**: Add all missing methods to prompt API documentation

---

### [CRITICAL] `commands.mdx` - `context.version` does not exist

- **File**: `apps/web/content/docs/core-concepts/commands.mdx`
- **Source**: `packages/core/src/types.ts:163-195`
- **Issue**: Handler context docs list `version` as a property, but it doesn't exist in `HandlerArgs`
- **Evidence**: `version` is NOT in `HandlerArgs` interface
- **Fix**: Remove `version` from Handler context list

---

### [HIGH] `commands.mdx` - `context.result/error/exitCode` wrong location

- **File**: `apps/web/content/docs/core-concepts/commands.mdx`
- **Source**: `packages/core/src/plugin/types.ts:128-137`
- **Issue**: Docs show `context.result`, `context.error`, `context.exitCode` in Handler context, but these only exist in `CommandResult` (postRun/afterCommand hooks)
- **Fix**: Clarify these are only available in postRun/afterCommand hooks, not handler context

---

### [HIGH] `plugins.mdx` - Missing `ExecutionState` class documentation

- **File**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/types.ts:17-35`
- **Issue**: `ExecutionState` used in `preRun`/`postRun` hooks but class definition not documented
- **Evidence**: Class with `get()`, `set()`, `has()`, `delete()` methods not documented
- **Fix**: Add `ExecutionState` class documentation with its API

---

### [HIGH] `plugins.mdx` - Missing exports

- **File**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts`, `packages/core/src/plugin/testing.ts`
- **Issue**: Several exported functions not documented
- **Missing**:
  - `createTestPlugin()` - line 29
  - `composePlugins()` - line 32
  - `createMockPluginContext()` - testing.ts
  - `createMockCommandContext()` - testing.ts
  - `testPluginHooks()` - testing.ts
  - `assertPluginBehavior()` - testing.ts
- **Fix**: Add documentation for all missing plugin utilities

---

### [HIGH] `plugins.mdx` - Missing `error` in `CommandResult`

- **File**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/types.ts:136`
- **Issue**: `CommandResult.error?: unknown` not documented
- **Fix**: Add `error?: unknown` to `CommandResult` interface

---

### [HIGH] `tui.mdx` - Inline subpath misdocumented

- **File**: `apps/web/content/docs/packages/tui.mdx`
- **Source**: `packages/tui/src/inline/index.ts`
- **Issue**: Docs claim `@bunli/tui/inline` exports List, Table, Markdown, Diff
- **Actual**: These components are in `@bunli/tui/interactive`. Inline exports prompt utilities.
- **Fix**: Correct the inline subpath documentation

---

### [HIGH] `guides/generated-types.mdx` - Duplicate content

- **File**: `apps/web/content/docs/guides/generated-types.mdx`
- **Source**: N/A
- **Issue**: Content duplicates `type-generation.mdx`
- **Fix**: Delete this file or significantly differentiate it

---

### [HIGH] `guides/building-your-first-cli.mdx` - Non-existent example reference

- **File**: `apps/web/content/docs/guides/building-your-first-cli.mdx`
- **Source**: `examples/` directory
- **Issue**: References `examples/todo-cli` which doesn't exist
- **Fix**: Remove this reference or point to an existing example

---

### [HIGH] `plugins.mdx` - Generic signature wrong

- **File**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts:45-58`
- **Issue**: `createPlugin` generic signature documented incorrectly
- **Evidence**: First generic is `TOptions`, second is `TStore`, but docs show reversed
- **Fix**: Correct generic parameter order

---

### [MEDIUM] `configuration.mdx` - HelpRenderer type not documented

- **File**: `apps/web/content/docs/core-concepts/configuration.mdx`
- **Source**: `packages/core/src/types.ts:223`
- **Issue**: `HelpRenderer<TStore>` type and `HelpRenderContext` not documented
- **Fix**: Add type definitions for custom help renderer

---

### [MEDIUM] `configuration.mdx` - Config override behavior nuanced

- **File**: `apps/web/content/docs/core-concepts/configuration.mdx`
- **Source**: `packages/core/src/cli.ts:178-183`
- **Issue**: Merging behavior with empty array vs undefined is nuanced
- **Evidence**: Empty array `[]` overrides (truthy), undefined falls back
- **Fix**: Clarify this edge case

---

### [MEDIUM] `validation.mdx` - Valibot examples may be outdated

- **File**: `apps/web/content/docs/core-concepts/validation.mdx`
- **Source**: Valibot v1.x API
- **Issue**: Examples use old Valibot API patterns
- **Fix**: Update examples to Valibot v1.x patterns

---

### [MEDIUM] `create-cli.mdx` - `generated` default not documented

- **File**: `apps/web/content/docs/api/create-cli.mdx`
- **Source**: `packages/core/src/cli.ts:139`
- **Issue**: `generated` defaults to `true` but not documented
- **Fix**: Add note about default value

---

### [MEDIUM] `runtime.mdx` - Incomplete documentation

- **File**: `apps/web/content/docs/packages/runtime.mdx`
- **Source**: `packages/runtime/src/`
- **Issue**: Subpaths `@bunli/runtime/app`, `@bunli/runtime/prompt` not thoroughly documented
- **Fix**: Add documentation for significant subpath exports

---

### [LOW] `cli.mdx` - Library vs CLI usage confusion

- **File**: `apps/web/content/docs/packages/cli.mdx`
- **Source**: `packages/cli/src/index.ts`
- **Issue**: Doc describes CLI commands but package only exports config utilities
- **Note**: This is correct for CLI users but misleading for library developers
- **Fix**: Consider splitting into user guide vs library API

---

### [LOW] `testing.mdx` - Unverified `mockShellCommands`

- **File**: `apps/web/content/docs/guides/testing.mdx`
- **Source**: `packages/test/src/index.ts`
- **Issue**: `mockShellCommands` referenced but not verified in exports
- **Fix**: Verify and document or remove reference

---

### [LOW] `type-generation.mdx` - Unverified `bunli generate`

- **File**: `apps/web/content/docs/guides/type-generation.mdx`
- **Source**: CLI commands
- **Issue**: References `bunli generate` command that couldn't be fully verified
- **Fix**: Verify command exists and document correctly

---

## Files to Modify

1. `apps/web/content/docs/api/create-cli.mdx` - Fix execute() signature, document `generated` default
2. `apps/web/content/docs/api/define-config.mdx` - Fix commands.entry type, add external, add defaults
3. `apps/web/content/docs/api/define-command.mdx` - Add missing prompt methods
4. `apps/web/content/docs/api/plugins.mdx` - Add ExecutionState, missing exports, fix generics
5. `apps/web/content/docs/core-concepts/commands.mdx` - Remove context.version, fix result/error/exitCode
6. `apps/web/content/docs/core-concepts/configuration.mdx` - Add HelpRenderer types
7. `apps/web/content/docs/core-concepts/validation.mdx` - Update Valibot examples
8. `apps/web/content/docs/packages/tui.mdx` - Fix inline subpath documentation
9. `apps/web/content/docs/packages/runtime.mdx` - Expand subpath documentation
10. `apps/web/content/docs/guides/generated-types.mdx` - Delete as duplicate
11. `apps/web/content/docs/guides/building-your-first-cli.mdx` - Remove todo-cli reference

---

## Verification Checklist

- [ ] `packages/core/src/cli.ts` read for createCLI
- [ ] `packages/core/src/types.ts` read for defineCommand, option
- [ ] `packages/core/src/config.ts` read for defineConfig
- [ ] `packages/core/src/plugin/` read for plugin system
- [ ] `packages/runtime/src/prompt/index.ts` read for PromptApi
- [ ] All other packages verified via explorers
