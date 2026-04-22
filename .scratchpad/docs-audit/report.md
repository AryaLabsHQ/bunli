# Documentation Audit Report

**Date**: 2026-04-22
**Scope**: Full audit (all sections)
**Summary**: 4 critical, 7 high, 13 medium, 11 low

---

## CRITICAL Issues

### 1. `plugins.mdx` — `createPlugin` signature completely wrong

- **Doc**: `apps/web/content/docs/api/plugins.mdx` (lines 186-194)
- **Source**: `packages/core/src/plugin/create.ts` (lines 45-54)
- **Issue**: The doc shows `createPlugin` as two separate overloads with a factory pattern, but the actual implementation is an identity function with overloads:

```typescript
// ACTUAL SOURCE (create.ts lines 45-54)
export function createPlugin<TOptions, TStore = {}>(
  factory: (options: TOptions) => BunliPlugin<TStore>,
): (options: TOptions) => BunliPlugin<TStore>;
export function createPlugin<TStore = {}>(plugin: BunliPlugin<TStore>): BunliPlugin<TStore>;
export function createPlugin<T>(input: T): T { return input; }
```

The doc needs complete rewrite of the `createPlugin` section to show the identity function pattern with correct overload order.

---

### 2. `plugins.mdx` — `createTestPlugin` and `composePlugins` not exported

- **Doc**: `apps/web/content/docs/api/plugins.mdx` (lines 107, 117-159)
- **Source**: `packages/core/src/plugin/create.ts` (lines 93-159) — exports DO exist but are NOT re-exported from `packages/core/src/plugin/index.ts`
- **Issue**: `createTestPlugin` and `composePlugins` are used throughout the doc but cannot be imported from `@bunli/core/plugin`. Either export them from the index, or remove them from docs.

---

### 3. `plugins.mdx` — `CommandContext` accessor methods don't exist

- **Doc**: `apps/web/content/docs/api/plugins.mdx` (lines 109-119)
- **Source**: `packages/core/src/plugin/context.ts` (lines 60-104)
- **Issue**: Doc claims `context.getStoreValue()`, `context.setStoreValue()`, `context.hasStoreValue()` exist. These are declared in the TYPE (plugin/types.ts lines 188-201) but the actual `CommandContext` class does not implement them — you access `context.store` directly.

---

### 4. `building-your-first-cli.mdx` — References non-existent todo-cli example

- **Doc**: `apps/web/content/docs/guides/building-your-first-cli.mdx` (line 415)
- **Source**: `examples/` directory
- **Issue**: References `https://github.com/AryaLabsHQ/bunli/tree/main/examples/todo-cli` which does not exist.

---

## HIGH Issues

### 5. `store` package — Completely undocumented

- **Doc**: none
- **Source**: `packages/store/src/`
- **Issue**: No doc file exists for `@bunli/store`. Package has `createStore`, error types (`StoreReadError`, `StoreWriteError`, `StoreParseError`, `StoreValidationError`), and types (`FieldDef`, `StoreInstance`, etc.)

### 6. `runtime` package — Completely undocumented

- **Doc**: none
- **Source**: `packages/runtime/src/`
- **Issue**: No doc file exists for `@bunli/runtime`. Package has event system (`RuntimeRendererStartedEvent`, etc.), transport system, and renderer options.

### 7. `tui` package — Completely undocumented

- **Doc**: none
- **Source**: `packages/tui/src/`
- **Issue**: No doc file exists for `@bunli/tui`. Package has components, `createSyncBatcher`, and styling utilities.

### 8. `git-tool.mdx` — Broken "Next Steps" links

- **Doc**: `apps/web/content/docs/examples/git-tool.mdx`
- **Issue**: References non-existent guides:
  - `/docs/guides/command-organization`
  - `/docs/guides/external-tools`
  - `/docs/guides/shell-integration`

### 9. `dev-server.mdx` — Broken "Next Steps" links

- **Doc**: `apps/web/content/docs/examples/dev-server.mdx`
- **Issue**: References non-existent guides:
  - `/docs/guides/plugin-system` (should be `/docs/core-concepts/plugins`)
  - `/docs/guides/configuration` (should be `/docs/core-concepts/configuration`)
  - `/docs/guides/long-running`
  - `/docs/guides/real-time`

### 10. `generated-types.mdx` — Orphan page not in navigation

- **Doc**: `apps/web/content/docs/guides/generated-types.mdx` exists but NOT listed in `meta.json`
- **Issue**: Content hidden from users

---

## MEDIUM Issues

### 11. `create-cli.mdx` — CLI interface generic mismatch

- **Doc**: line 76: `interface CLI<TStore = any>`
- **Source**: `packages/core/src/types.ts` line 80: `interface CLI<TStore = {}>`
- **Issue**: `any` vs `{}` are not identical

### 12. `commands.mdx` — `context` is optional but shown as required

- **Doc**: lines 72-91 show all handler context properties
- **Source**: `types.ts` line 190 `context?: CommandContext...`
- **Issue**: `context` is optional (only present with plugins) but docs don't indicate this

### 13. `configuration.mdx` — `bufferMode` default comment wrong

- **Doc**: line 192: `bufferMode: "alternate"` comment implies alternate is default
- **Source**: `cli.ts` line 77: `bufferMode: configuredBufferMode ?? "standard"`
- **Issue**: Default is `"standard"`, not `"alternate"`

### 14. `type-inference.mdx` — `execute()` overload description misleading

- **Doc**: lines 80-106
- **Source**: `cli.ts` lines 1158-1216
- **Issue**: Description slightly misleading about how args/options are distinguished

### 15. `define-command.mdx` — `RunnableCommand` doesn't mention `InferOptions`

- **Doc**: lines 38-44
- **Source**: `types.ts` lines 142-156
- **Issue**: Doc shows `RunnableCommand<TOptions, TStore>` but actual type uses `CommandLeaf<TOptions, TStore, TName>` with `InferOptions<TOptions>` transformation

### 16. `core.mdx` — Incomplete plugin lifecycle documentation

- **Doc**: `apps/web/content/docs/packages/core.mdx`
- **Issue**: Doesn't fully document `beforeCommand`/`afterCommand` hooks

### 17. `plugins.mdx` — `beforeCommand` uses `any` not `TStore`

- **Doc**: line 32
- **Source**: `plugin/types.ts` line 68: `beforeCommand?(context: CommandContext<any>): void | Promise<void>;`
- **Issue**: Uses `any` not `TStore` in signature

### 18. `plugins.mdx` — `InferPluginOptions` and `InferPluginStore` undocumented

- **Doc**: missing
- **Source**: `plugin/create.ts` lines 64-75
- **Issue**: Useful type helpers exist but aren't documented

### 19. `building-your-first-cli.mdx` — Wrong directory structure

- **Doc**: Shows commands in `src/commands/`
- **Source**: Actual examples use `commands/` directly
- **Issue**: Inconsistent with actual patterns

### 20. `schema-validation.mdx` — May reference non-existent API

- **Doc**: lines 429-458
- **Issue**: References `getCommandApi("create-user").options` — verify this exists

### 21. `interactive-prompts.mdx` — Import path needs verification

- **Doc**: lines 13, 574 reference `PromptCancelledError` from `@bunli/runtime/prompt`
- **Issue**: Verify actual export path

### 22. `testing.mdx` — `expectCommand` matcher may not exist

- **Doc**: lines 418-434
- **Issue**: Verify `expectCommand` is exported from `@bunli/test`

---

## LOW Issues

| # | File | Issue |
|---|------|-------|
| 23 | `create-cli.mdx` | `help.renderer` shown as `HelpRenderer` but config uses `z.unknown()` |
| 24 | `validation.mdx` | Accurate |
| 25 | `core-concepts/plugins.mdx` | Lifecycle order verified accurate |
| 26 | `core-concepts/plugins.mdx` | `postRun` context.result verified accurate |
| 27 | `packages/plugins/config.mdx` | Accurate |
| 28 | `packages/plugins/ai-detect.mdx` | Accurate |
| 29 | `packages/plugins/completions.mdx` | Accurate |
| 30 | `packages/plugins/mcp.mdx` | Accurate |
| 31 | `packages/plugins/skills.mdx` | Accurate |
| 32 | `distribution.mdx` | References `bunli-releaser` action — verify exists |

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **critical** | 4 | `createPlugin` signature wrong, missing exports, non-existent example |
| **high** | 6 | 3 undocumented packages, 3 files with broken links |
| **medium** | 12 | Various stale content, incorrect signatures, missing type docs |
| **low** | 10 | Minor verification needed |

---

## Recommended Actions

1. **Fix `plugins.mdx`** — Rewrite `createPlugin` section, add missing exports OR remove references, fix `CommandContext` accessor docs
2. **Create 3 new doc files** — for `store`, `runtime`, `tui` packages
3. **Fix broken links** — in `git-tool.mdx` and `dev-server.mdx`
4. **Add orphan page** — `generated-types.mdx` to navigation or consolidate
5. **Fix configuration.mdx** — `bufferMode` default comment
6. **Fix commands.mdx** — mark `context` as optional
7. **Fix create-cli.mdx** — `CLI<TStore = {}>` not `any`
8. **Verify all medium/low issues** — cross-check against actual implementation