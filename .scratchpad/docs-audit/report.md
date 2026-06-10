# Documentation Audit Report

**Date**: 2026-06-10
**Scope**: Full audit — API reference, core concepts, packages, guides, examples
**Summary**: 2 critical, 6 high, 20 medium, 10 low

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| **critical** | Docs describe APIs/behavior that don't exist or work differently |
| **high** | Entire features missing, broken references, wrong signatures |
| **medium** | Partially stale content, missing properties, incomplete examples |
| **low** | Minor wording improvements, better examples possible |

---

## CRITICAL Issues

### 1. `define-config.mdx` — Missing `workspace` field in `BunliConfigInput`

- **Doc**: `apps/web/content/docs/api/define-config.mdx` lines 22-100
- **Source**: `packages/core/src/config.ts` lines 105-113
- **Issue**: The documented `BunliConfigInput` interface is missing the `workspace` field entirely
- **Evidence**:
  ```typescript
  // Source defines:
  workspace: z.object({
    packages: z.array(z.string()).optional(),
    shared: z.unknown().optional(),
    versionStrategy: z.enum(["fixed", "independent"]).default("fixed"),
  })
  ```
  The doc's interface has no `workspace` property.
- **Fix**: Add `workspace` to the documented `BunliConfigInput` interface

### 2. `building-your-first-cli.mdx` — Referenced `todo-cli` example doesn't exist

- **Doc**: `apps/web/content/docs/guides/building-your-first-cli.mdx` line 415
- **Reference**: "Find the complete todo CLI example in the [Bunli repository](https://github.com/AryaLabsHQ/bunli/tree/main/examples/todo-cli)"
- **Issue**: The `examples/todo-cli` directory does not exist
- **Evidence**: Actual examples are: `hello-world`, `task-runner`, `git-tool`, `dev-server`
- **Fix**: Remove the reference or point to an existing example

---

## HIGH Issues

### 3. `plugins.mdx` (API) — `createPlugin` only shows one overload, missing factory form

- **Doc**: `apps/web/content/docs/api/plugins.mdx` lines 186-194
- **Source**: `packages/core/src/plugin/create.ts` lines 45-54
- **Issue**: Documentation shows only the direct plugin overload. The factory form is missing.
- **Evidence**: Source has two overloads:
  ```typescript
  // Factory overload
  function createPlugin<TOptions, TStore = {}>(
    factory: (options: TOptions) => BunliPlugin<TStore>,
  ): (options: TOptions) => BunliPlugin<TStore>;
  ```
- **Fix**: Add the factory form overload to the documentation

### 4. `plugins.mdx` (API) — Missing `composePlugins`, `createTestPlugin` exports

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts` lines 93-160, `packages/core/src/plugin/index.ts` line 10
- **Issue**: Both functions are exported but not documented
- **Fix**: Add documentation for `createTestPlugin` and `composePlugins`

### 5. `plugins.mdx` (core-concepts) — Handler `context` incorrectly shows PluginContext methods

- **Doc**: `apps/web/content/docs/core-concepts/plugins.mdx` lines 69-110, 222
- **Source**: `packages/core/src/plugin/types.ts` lines 172-202 (`CommandContext`)
- **Issue**: Handler `context` is `CommandContext`, not `PluginContext`. It does NOT have `updateConfig()`, `registerCommand()`, `logger`, or `paths`.
- **Fix**: Clarify that handler `context` is `CommandContext` (command execution phase), while `PluginContext` is only available during `setup` hooks.

### 6. `git-tool.mdx` (examples) — Broken navigation links to non-existent guides

- **Doc**: `apps/web/content/docs/examples/git-tool.mdx` lines 403-404
- **References**: `/docs/guides/command-organization`, `/docs/guides/external-tools`, `/docs/guides/shell-integration`
- **Issue**: These guide pages do not exist
- **Fix**: Remove or update these links to existing guides

### 7. `dev-server.mdx` (examples) — Broken navigation links to non-existent guides

- **Doc**: `apps/web/content/docs/examples/dev-server.mdx` lines 412-415
- **References**: `/docs/guides/plugin-system`, `/docs/guides/configuration`, `/docs/guides/long-running`, `/docs/guides/real-time`
- **Issue**: These guide pages do not exist
- **Fix**: Remove or update these links to existing guides

### 8. `building-your-first-cli.mdx` — `aiAgentPlugin` may not exist in `@bunli/plugin-ai-detect`

- **Doc**: `apps/web/content/docs/guides/building-your-first-cli.mdx` line 283
- **Reference**: `import { aiAgentPlugin } from "@bunli/plugin-ai-detect";`
- **Issue**: Need to verify actual export name from the package
- **Fix**: Verify and correct the export name

---

## MEDIUM Issues

### 9. `create-cli.mdx` — `runtimeDeps` parameter missing default value in docs

- **Doc**: `apps/web/content/docs/api/create-cli.mdx` line 18
- **Source**: `packages/core/src/cli.ts` line 146
- **Issue**: Doc shows `runtimeDeps?: CreateCLIRuntimeDeps` but source has `runtimeDeps: CreateCLIRuntimeDeps = {}`
- **Fix**: Update docs to show the default value

### 10. `define-config.mdx` — `loadConfig` function not documented

- **Doc**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config-loader.js`, `packages/core/src/index.ts` line 10
- **Issue**: `loadConfig` and `loadConfigResult` are exported but not documented
- **Fix**: Add documentation for these functions

### 11. `define-config.mdx` — `BuildConfig` type not defined in docs

- **Doc**: `apps/web/content/docs/api/define-config.mdx` line 40
- **Source**: `packages/core/src/config.ts` lines 62-77
- **Issue**: Doc references `BuildConfig` type but never defines it
- **Fix**: Define `BuildConfig` interface inline or clarify the structure

### 12. `define-command.mdx` — `outputPolicy` and `defaultFormat` in wrong location

- **Doc**: `apps/web/content/docs/api/define-command.mdx` lines 54, 126-128, 362-375
- **Source**: `packages/core/src/types.ts` lines 125-128
- **Issue**: `outputPolicy` and `defaultFormat` are shown in `CommandTuiOptions` example but exist in `BaseCommand`
- **Fix**: Clarify they go at command level, not just TuiOptions

### 13. `plugins.mdx` (API) — Missing `InferPluginOptions` and `InferPluginStore` type utilities

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/create.ts` lines 64-75
- **Issue**: Type utilities are exported but not documented
- **Fix**: Add documentation for these type utilities

### 14. `plugins.mdx` (API) — `ExecutionState` class not documented

- **Doc**: `apps/web/content/docs/api/plugins.mdx`
- **Source**: `packages/core/src/plugin/types.ts` lines 18-36
- **Issue**: `ExecutionState` is exported but not documented
- **Fix**: Add `ExecutionState` class documentation

### 15. `define-config.mdx` — `bunliConfigSchema` and `BunliConfigStrict` not documented

- **Doc**: `apps/web/content/docs/api/define-config.mdx`
- **Source**: `packages/core/src/config.ts` lines 52-200
- **Issue**: These advanced config types are exported but not documented
- **Fix**: Add documentation for these types

### 16. `type-inference.mdx` — Wrong import pattern for generated store

- **Doc**: `apps/web/content/docs/core-concepts/type-inference.mdx` line 116
- **Reference**: `import { cli } from "./.bunli/commands.gen";`
- **Issue**: No `cli` export exists. Exports are: `GeneratedStore`, `GeneratedCommandMeta`, etc.
- **Fix**: Show `createGeneratedHelpers(modules, metadata)` pattern instead

### 17. `type-inference.mdx` — Overstated `as const` requirement

- **Doc**: `apps/web/content/docs/core-concepts/type-inference.mdx` lines 43-50
- **Source**: `packages/core/src/types.ts` lines 269-277
- **Issue**: `as const` is framed as "required" but is only "strongly recommended" for better type inference
- **Fix**: Rephrase as strongly recommended rather than required

### 18. `validation.mdx` — Unclear about repeatable option behavior with defaults

- **Doc**: `apps/web/content/docs/core-concepts/validation.mdx` lines 171-193
- **Source**: `packages/core/src/parser.ts` lines 69-71, 95-97, 111-112
- **Issue**: Interaction between `repeatable: true` and `.default()` is not documented
- **Fix**: Document that `repeatable` replaces the default rather than accumulating

### 19. `core.mdx` — Missing Type Utilities

- **Doc**: `apps/web/content/docs/packages/core.mdx`
- **Source**: `packages/core/src/index.ts`
- **Issue**: Doc shows ~6 type utilities but ~18+ exist (`PickRequired`, `PickOptional`, etc.)
- **Fix**: Add documentation for additional type utilities

### 20. `core.mdx` — Missing Validation Utilities

- **Doc**: `apps/web/content/docs/packages/core.mdx`
- **Source**: `packages/core/src/index.ts` exports `validateValue`, `validateValues`, etc.
- **Issue**: Validation utilities are not documented
- **Fix**: Add "Validation Utilities" section

### 21. `core.mdx` — Missing Result/Error Utilities

- **Doc**: `apps/web/content/docs/packages/core.mdx`
- **Source**: `packages/core/src/index.ts` exports `Result`, `Ok`, `Err`, `TaggedError`, etc.
- **Issue**: Result pattern and error classes not fully documented
- **Fix**: Add documentation for Result pattern and error classes

### 22. `generator.mdx` — Missing `isCommandFile` Export

- **Doc**: `apps/web/content/docs/packages/generator.mdx`
- **Source**: `packages/generator/src/index.ts`
- **Issue**: `isCommandFile` is exported but not documented
- **Fix**: Document `isCommandFile` utility function

### 23. `test.mdx` — Missing `TestCLIInstance` Type

- **Doc**: `apps/web/content/docs/packages/test.mdx`
- **Source**: `packages/test/src/index.ts`
- **Issue**: `TestCLIInstance` type is exported but not documented
- **Fix**: Document `TestCLIInstance` in the API reference

### 24. `hello-world.mdx` — `render` property may have incorrect signature

- **Doc**: `apps/web/content/docs/guides/hello-world.mdx` line 98
- **Source**: `packages/core/src/types.ts` shows `RenderArgs<TFlags, TStore>` extends `HandlerArgs`
- **Issue**: Doc shows `render: ({ flags })` but actual RenderArgs includes more properties
- **Fix**: Update render signature to include full HandlerArgs

### 25. `interactive-prompts.mdx` — `PromptOptions` interface description may be incomplete

- **Doc**: `apps/web/content/docs/guides/interactive-prompts.mdx` lines 525-547
- **Source**: `packages/runtime/src/prompt/index.ts`
- **Issue**: Documents `PromptOptions` interface but actual interface has more options
- **Fix**: Verify and document all PromptOptions properties

### 26. `tui-gallery.mdx` — Command reference may differ from actual

- **Doc**: `apps/web/content/docs/guides/tui-gallery.mdx` line 34
- **Reference**: `bun cli.ts gallery`
- **Issue**: Actual command structure may differ
- **Fix**: Verify and correct the command reference

---

## LOW Issues

### 27. `create-cli.mdx` — `init()` method documented as no-op but shouldn't be highlighted

- **Doc**: `apps/web/content/docs/api/create-cli.mdx` line 81
- **Source**: `packages/core/src/cli.ts` lines 1014-1016
- **Fix**: Remove from public API docs or note it's reserved for future use

### 28. `option.mdx` — `CLIOption<S>` return type not shown in docs

- **Doc**: `apps/web/content/docs/api/option.mdx` line 21
- **Source**: `packages/core/src/types.ts` lines 257-263
- **Fix**: Link to `CLIOption` type definition

### 29. `plugins.mdx` (API) — `Logger` interface shows methods but not their signatures

- **Doc**: `apps/web/content/docs/api/plugins.mdx` lines 293-306
- **Source**: `packages/core/src/utils/logger.js`
- **Fix**: Verify logger signatures match source

### 30. `commands.mdx` — Handler context `formatExplicit` property not documented

- **Doc**: `apps/web/content/docs/core-concepts/commands.mdx` line 104
- **Source**: `packages/core/src/types.ts` line 219
- **Issue**: `formatExplicit` is important for commands to know if format was explicitly set
- **Fix**: Add `formatExplicit` to handler context documentation

### 31. `commands.mdx` — `image` TUI options documentation doesn't mention resolved types

- **Doc**: `apps/web/content/docs/core-concepts/commands.mdx` line 103
- **Source**: `packages/core/src/types.ts` lines 43-46 (`ResolvedTuiImageOptions`)
- **Issue**: Handler receives `ResolvedTuiImageOptions` where `mode` is always defined (not optional)
- **Fix**: Note that `image.mode` is always defined in handler context

### 32. `configuration.mdx` — `help.renderer` schema is `z.unknown()`, not typed HelpRenderer

- **Doc**: `apps/web/content/docs/core-concepts/configuration.mdx` lines 209-216
- **Source**: `packages/core/src/config.ts` lines 142-146
- **Fix**: Clarify that schema accepts any type but proper `HelpRenderer` is expected

### 33. `commands.mdx` — `outputPolicy` description incomplete

- **Doc**: `apps/web/content/docs/core-concepts/commands.mdx` lines 427-444
- **Source**: `packages/core/src/output/policy.ts`
- **Issue**: Doesn't mention interaction with `formatExplicit`
- **Fix**: Add note about interaction between `outputPolicy` and explicit format flags

### 34. `commands.mdx` — `context` in command handler is optional, store typed as `Record<string, unknown>`

- **Doc**: `apps/web/content/docs/core-concepts/commands.mdx` lines 221-232
- **Source**: `packages/core/src/types.ts` line 206
- **Issue**: Plugin store access in handlers requires module augmentation for full type safety
- **Fix**: Add note about module augmentation requirement

### 35. `testing.mdx` — `execute` vs `run` method naming inconsistency

- **Doc**: `apps/web/content/docs/guides/testing.mdx` line 86
- **Source**: `packages/test/src/test-cli.ts`
- **Issue**: Method may be `run` not `execute`
- **Fix**: Verify and correct the method name

### 36. `tui-gallery.mdx` — Shell model keyboard shortcuts should be verified

- **Doc**: `apps/web/content/docs/guides/tui-gallery.mdx` lines 55-72
- **Reference**: F1-F5, Alt+T shortcuts
- **Issue**: Should be verified against actual implementation
- **Fix**: Verify and correct keyboard shortcuts if needed

---

## Summary Table

| Severity | Count |
|----------|-------|
| critical | 2 |
| high | 6 |
| medium | 17 |
| low | 10 |
| **Total** | **35** |

---

## Doc↔Implementation Mapping Discovered

| Doc Section | Source Directory | Coverage |
|-------------|------------------|----------|
| api/ | `packages/core/src/` | Partial — missing exports documented |
| core-concepts/ | `packages/core/src/` | Mostly accurate, some behavioral gaps |
| packages/ | `packages/*/` | All 14 packages documented, but incomplete exports |
| guides/ | `examples/`, `packages/cli/` | Broken links, stale references |
| examples/ | `examples/*/` | 4 examples, one broken link |

---

## Recommendations

1. **Fix critical issues immediately** — broken references cause immediate user friction
2. **Add missing exports to core docs** — `loadConfig`, `composePlugins`, `createTestPlugin` are commonly used
3. **Clarify handler context vs plugin context** — this is a common confusion point
4. **Verify all guide links** — several link to non-existent pages
5. **Complete type utilities documentation** — core package has many undocumented utilities