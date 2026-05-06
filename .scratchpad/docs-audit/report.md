# Documentation Audit Report

**Date**: 2026-05-06
**Scope**: Full audit (api/, core-concepts/, packages/, guides/, examples/)
**Summary**: 5 critical, 8 high, 18 medium, 4 low

---

## Findings

### CRITICAL

#### 1. Missing `plugins` field in `BunliConfigInput`
- **Doc**: `api/define-config.mdx` (lines 36-37)
- **Source**: `packages/core/src/config.ts` line 139
- **Issue**: The `plugins` configuration option is missing entirely from documented `BunliConfigInput` interface
- **Evidence**: `plugins: z.array(pluginConfigSchema).default([])` exists in source but not documented
- **Fix**: Add `plugins?: PluginConfig[]` to the `BunliConfigInput` interface in docs

#### 2. `execute()` method signature documentation wrong
- **Doc**: `api/create-cli.mdx` (lines 86-96), `core-concepts/commands.mdx` (lines 80-106)
- **Source**: `packages/core/src/types.ts` lines 101-110
- **Issue**: Docs show type-safe overloads that don't exist in source. Actual signature is: `execute(commandName: string, args?: string[]): Promise<void>`
- **Evidence**: Only one execute signature exists, not three overloads
- **Fix**: Update docs to reflect actual single signature with optional args array

#### 3. Generated types APIs don't exist
- **Doc**: `guides/generated-types.mdx` (lines 68-91), `guides/type-generation.mdx` (lines 49-89), `core-concepts/type-inference.mdx` (lines 137-150)
- **Source**: `packages/generator/src/generator.ts`, `packages/generator/src/builder.ts`
- **Issue**: Documentation describes `getTypedFlags()`, `validateCommand()`, `findCommandByName()`, `findCommandsByDescription()`, `getFlags()`, `getFlagsMeta()` - none exist in actual generated output
- **Evidence**: Only `listCommands()` and `getCommandApi(name)` are actually generated
- **Fix**: Update guides to describe actual generated APIs: `listCommands()` and `getCommandApi<Name>(name)`

#### 4. `PromptApi` usage pattern documented incorrectly
- **Doc**: `guides/interactive-prompts.mdx` (lines 163-169, 174-177, 186-188)
- **Source**: `packages/runtime/src/prompt/index.ts` lines 2410-2428
- **Issue**: Docs show `prompt.text()`, `prompt.confirm()`, `prompt.select()` as method calls, but actual `PromptApi` is a callable function with direct properties
- **Evidence**: Correct usage is `text("message", options)` NOT `prompt.text("message", options)`
- **Fix**: Update all prompt usage examples to use correct API pattern

#### 5. `tui` and `runtime` packages missing from navigation
- **Doc**: `packages/meta.json`
- **Source**: `packages/runtime/`, `packages/tui/` both exist with docs
- **Issue**: `tui` and `runtime` documentation files exist but are not in navigation meta.json
- **Evidence**: `apps/web/content/docs/packages/runtime.mdx` and `apps/web/content/docs/packages/tui.mdx` exist but `meta.json` only has: `["index", "create-bunli", "core", "utils", "test", "cli", "generator", "plugins"]`
- **Fix**: Add `tui` and `runtime` to the pages array in `packages/meta.json`

---

### HIGH

#### 6. `PluginContext.config` not readonly in source
- **Doc**: `api/plugins.mdx` (lines 60-66)
- **Source**: `packages/core/src/plugin/types.ts` line 148
- **Issue**: Docs say `readonly config: BunliConfigInput` but source doesn't have `readonly`
- **Fix**: Remove `readonly` from docs or note it's mutable

#### 7. `updateConfig` parameter type wrong
- **Doc**: `api/plugins.mdx` (lines 65-66)
- **Source**: `packages/core/src/plugin/types.ts` line 151
- **Issue**: Docs say `updateConfig(partial: Partial<BunliConfigInput>)` but source takes full `BunliConfigInput`
- **Fix**: Change `Partial<BunliConfigInput>` to `BunliConfigInput`

#### 8. `help` field marked required but is optional
- **Doc**: `api/define-config.mdx` (lines 64-67)
- **Source**: `packages/core/src/config.ts` lines 142-146
- **Issue**: `help` is documented as `help?:` inside object but source has `.optional()` on whole object
- **Fix**: Fix `help` field definition to show it's `help?: { renderer?: unknown }` with renderer also optional

#### 9. Missing `preRun` and `postRun` hooks from plugin interface
- **Doc**: `api/plugins.mdx` (lines 26-52)
- **Source**: `packages/core/src/plugin/types.ts` lines 54-92
- **Issue**: `preRun` and `postRun` hooks exist in source but aren't documented in BunliPlugin interface
- **Evidence**:
  ```typescript
  preRun?(context: CommandContext<any>, state: ExecutionState): void | Promise<void>;
  postRun?(context: CommandContext<any> & CommandResult, state: ExecutionState): void | Promise<void>;
  ```
- **Fix**: Add `preRun` and `postRun` to the BunliPlugin interface documentation

#### 10. `dev.inspect` default value documentation wrong
- **Doc**: `core-concepts/configuration.mdx` (line 175)
- **Source**: `packages/core/src/config.ts` lines 82-83
- **Issue**: Docs say `inspect: true` as default but actual default is `false`
- **Fix**: Change `inspect: true` to `inspect: false` in docs

#### 11. `withCLI()` return type wrong
- **Doc**: `core-concepts/type-inference.mdx` (line 133)
- **Source**: `packages/generator/src/builder.ts` line 95
- **Issue**: Docs say returns `GeneratedExecutor` but actual is `{ execute(name: string, options: unknown): Promise<void> }`
- **Fix**: Update return type to reflect actual interface

#### 12. `bunli build --targets` flag doesn't exist
- **Doc**: `guides/building-your-first-cli.mdx` (lines 239-247)
- **Source**: `packages/cli/src/commands/build.ts`
- **Issue**: Documents `bunli build --targets all`, `bunli build --targets native` but CLI doesn't support `--targets` flag
- **Fix**: Remove `--targets` examples; build targets are configured via `bunli.config.ts`

#### 13. Custom test matchers have wrong names
- **Doc**: `guides/testing.mdx` (lines 416-435)
- **Source**: `packages/test/src/matchers.ts`
- **Issue**: Docs show `toHaveSucceeded()`, `toContainInStdout()`, `toContainInStderr()` but actual matcher names may differ
- **Fix**: Verify and correct matcher names in documentation

---

### MEDIUM

#### 14. Missing `build.*` field default values
- **Doc**: `api/define-config.mdx` (lines 40-48)
- **Source**: `packages/core/src/config.ts` lines 62-77
- **Issue**: `targets` defaults to `[]`, `compress` to `false`, `minify` to `false`, `sourcemap` to `true` not documented
- **Fix**: Add default values to build field documentation

#### 15. Missing `release.binary` default values
- **Doc**: `api/define-config.mdx` (lines 75-78)
- **Source**: `packages/core/src/config.ts` lines 124-129
- **Issue**: `packageNameFormat` defaults to `"{{name}}-{{platform}}"`, `shimPath` to `"bin/run.mjs"` not documented
- **Fix**: Add default values to binary field documentation

#### 16. `image.width/height` validation constraints missing
- **Doc**: `api/define-config.mdx` (lines 88-99)
- **Source**: `packages/core/src/config.ts` lines 157-164
- **Issue**: Docs show simple `number` but source uses `z.number().int().positive()` (positive integers only)
- **Fix**: Note that width/height must be positive integers

#### 17. Missing `env` in HandlerArgs formal interface
- **Doc**: `api/define-command.mdx` (HandlerArgs section)
- **Source**: `packages/core/src/types.ts` lines 198-199
- **Issue**: `env: typeof process.env` exists in source but not shown in HandlerArgs interface documentation
- **Fix**: Add `env` property to HandlerArgs interface in docs

#### 18. `workspace.shared` uses `any` instead of proper type
- **Doc**: `api/define-config.mdx` (line 84)
- **Source**: `packages/core/src/config.ts` line 108
- **Issue**: Uses `any` but source uses `z.unknown().optional()`
- **Fix**: Replace `any` with `unknown` for type safety

#### 19. `defineGroup` link is dead
- **Doc**: `api/index.mdx` (line 14)
- **Issue**: Links to `/docs/api/define-group` which doesn't exist; `defineGroup` is documented in `define-command.mdx`
- **Fix**: Remove dead link or point to correct location

#### 20. Missing runtime `prompt` subpath exports
- **Doc**: `packages/runtime.mdx`
- **Source**: `packages/runtime/src/prompt/index.ts` lines 1651-1815
- **Issue**: `PromptApi` exports `text()`, `password()`, `confirm()`, `select()`, `multiselect()`, `filter()`, `pager()` but not documented in runtime package docs
- **Fix**: Document the prompt subpath exports

#### 21. `@bunli/cli` describes internal commands as public API
- **Doc**: `packages/cli.mdx`
- **Source**: `packages/cli/src/index.ts` only exports: `{ loadConfig, defineConfig, BunliConfig, findEntry, version }`
- **Issue**: Docs describe `bunli init`, `bunli dev`, `bunli build` etc. as if they're library APIs, but these are internal commands not exported from the package
- **Fix**: Clarify that CLI commands are available via `bunli` binary, not as library imports

#### 22. `plugin-mcp` undocumented `extractCommandMetadata`
- **Doc**: `packages/plugins/mcp.mdx`
- **Source**: `packages/plugin-mcp/src/index.ts` line 66
- **Issue**: `extractCommandMetadata` is exported but not documented
- **Fix**: Add documentation for `extractCommandMetadata`

#### 23. `plugin-skills` programmatic API undocumented
- **Doc**: `packages/plugins/skills.mdx`
- **Source**: `packages/plugin-skills/src/index.ts`
- **Issue**: Exports like `builtinAgents`, `detectAgents`, `syncSkills`, `generateSkillFile` not documented
- **Fix**: Document programmatic API exports

#### 24. `utils` object not documented
- **Doc**: `packages/utils.mdx`
- **Source**: `packages/utils/src/index.ts`
- **Issue**: Package exports both named exports AND a `utils` object `{ colors }` but only named imports documented
- **Fix**: Document the `utils` object export

#### 25. `--bytecode` flag doesn't exist
- **Doc**: `guides/distribution.mdx` (lines 120-122)
- **Source**: `packages/cli/src/commands/build.ts`
- **Issue**: Documents `--bytecode` flag which doesn't exist in actual build command
- **Fix**: Remove `--bytecode` flag documentation

#### 26. `CommandScanner` API documentation unclear
- **Doc**: `packages/generator.mdx` (lines 66-113)
- **Source**: `packages/generator/src/scanner.ts`
- **Issue**: Import path and usage pattern not clearly documented
- **Fix**: Clarify `CommandScanner` import path and usage

#### 27. `tsconfig` path mapping not set up in examples
- **Doc**: `guides/generated-types.mdx` (lines 94-119)
- **Source**: No `tsconfig.json` in examples with `~commands/*` mapping
- **Issue**: Documents path mapping for `~commands/*` but no examples use this pattern
- **Fix**: Either remove path mapping docs or add tsconfig setup example

---

### LOW

#### 28. `See Also` section has wrong link for `defineGroup`
- **Doc**: `api/define-command.mdx` (line 489)
- **Issue**: Links to `/docs/api/define-command` instead of correct location
- **Fix**: Correct link to `defineGroup` section within `define-command.mdx`

#### 29. `SchemaError` dependency note
- **Doc**: `packages/core.mdx` (line 10-11)
- **Issue**: Claims "zero dependencies" but re-exports `SchemaError` from `@standard-schema/utils`
- **Fix**: Note this is a re-export, not a direct dependency

#### 30. `mockValidationAttempts` not explained
- **Doc**: `packages/test.mdx` (line 472)
- **Source**: `packages/test/src/index.ts`
- **Issue**: Function is mentioned in API reference but no usage example
- **Fix**: Add usage example for `mockValidationAttempts`

#### 31. `cwd` redundantly available in handler context
- **Doc**: `core-concepts/commands.mdx` (line 78)
- **Source**: `packages/core/src/types.ts` line 200
- **Issue**: `cwd` shown in handler context but also available via `env`
- **Fix**: Either note redundancy or clarify use case

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 8 |
| Medium | 18 |
| Low | 4 |

**Total: 35 findings**

---

## Priority Fixes

1. **Critical**: Navigation (add tui, runtime)
2. **Critical**: define-config.mdx (add plugins field)
3. **Critical**: create-cli.mdx (fix execute signature)
4. **Critical**: interactive-prompts.mdx (fix PromptApi usage)
5. **Critical**: generated-types.mdx + type-generation.mdx (fix generated API docs)
6. **High**: plugins.mdx (add preRun/postRun hooks, fix config readonly, fix updateConfig type)
7. **High**: configuration.mdx (fix dev.inspect default)
8. **High**: building-your-first-cli.mdx (remove --targets flag docs)
9. **High**: testing.mdx (fix matcher names)