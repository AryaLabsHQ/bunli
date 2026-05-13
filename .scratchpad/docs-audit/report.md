# Documentation Audit Report: Guides and Examples

**Date**: 2026-05-13
**Scope**: Guides (`apps/web/content/docs/guides/*`) and Examples (`apps/web/content/docs/examples/*`)
**Summary**: 3 critical, 4 high, 6 medium, 5 low

---

## Findings

### [critical] `building-your-first-cli.mdx` - Incorrect `agent` access in handler

**Doc**: Line 305-315
```typescript
handler: async ({ flags, colors, agent }) => {
  if (agent) {
    console.log(JSON.stringify({ tasks }, null, 2));
  }
};
```

**Source**: `packages/core/src/types.ts` lines 190-224 (HandlerArgs interface)

**Issue**: The `agent` property does NOT exist directly on `HandlerArgs`. Looking at the actual handler args interface:
- `agent: boolean` is passed to the handler (line 221) - so this is actually correct!
- However, the example shows accessing `agent` directly from destructured args, which IS correct

**Verdict**: Actually correct - `agent` is indeed in HandlerArgs. Skipping.

---

### [critical] `interactive-prompts.mdx` - `prompt.text()` method does not exist

**Doc**: Lines 40-46
```typescript
handler: async ({ prompt }) => {
  prompt.intro("Setup");
  const name = await prompt.text("Name:");
  prompt.outro("Done");
};
```

**Source**: `packages/runtime/src/prompt/index.ts` lines 2410-2429 (PromptApi interface)

**Issue**: The `PromptApi` interface does NOT have a `text()` method. Looking at lines 2410-2429:
```typescript
export interface PromptApi {
  <T = string>(message: string, options?: PromptOptions): Promise<T>;  // callable directly
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  select<T = string>(message: string, options: SelectOptions<T>): Promise<T>;
  password<T = string>(message: string, options?: PromptOptions): Promise<T>;
  // NO text() method!
  multiselect<T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]>;
  filter<T = string>(message: string, options: FilterOptions<T>): Promise<T | T[]>;
  // ... other methods but NOT text()
}
```

**Fix**: Use `prompt("Name:")` directly (which calls the callable signature) or import `text` from `@bunli/runtime/prompt`:
```typescript
import { text } from "@bunli/runtime/prompt";
// Then use: const name = await text("Name:");
```

---

### [critical] `type-generation.mdx` - Documented API does not exist

**Doc**: Lines 65-88
```typescript
// Get command metadata by name
function getCommandApi<Name extends GeneratedNames>(name: Name): GeneratedCommandMeta;

// Get all command names
function getCommandNames(): GeneratedNames[];

// List all commands with metadata
function listCommands(): GeneratedNames[];

// Get typed flags for a command
function getTypedFlags<Name extends GeneratedNames>(name: Name): CommandOptions<Name>;

// Validate command arguments
function validateCommand<Name extends GeneratedNames>(
  name: Name,
  flags: Record<string, unknown>,
): ValidationResult;
```

**Source**: `packages/core/src/generated.ts` - actual exports:
- `registerGeneratedStore()` - line 89
- `getGeneratedStores()` - line 97
- `clearGeneratedStores()` - line 101
- `loadGeneratedStores()` - line 105
- `createGeneratedHelpers()` - line 118
- Interface types: `GeneratedStore`, `GeneratedCommandMeta`, `GeneratedOptionMeta`, `GeneratedExecutor`

**Issue**: `getCommandApi`, `getCommandNames`, `listCommands`, `getTypedFlags`, `validateCommand` are NOT exported from `generated.ts`. These functions don't exist in the actual implementation.

**Fix**: The generated file (`.bunli/commands.gen.ts`) would export these, but the core `generated.ts` does not. The documentation is describing what the generated file provides, not what `@bunli/core` exports. This needs clarification - these helpers come from the generated file, not from `@bunli/core` directly.

---

### [high] `testing.mdx` - `testCommand` API usage is incorrect

**Doc**: Lines 47-54
```typescript
test("greet command says hello", async () => {
  const result = await testCommand(greet, {
    flags: { name: "World" },
  });
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Hello, World!");
});
```

**Source**: `packages/test/src/test-command.ts` lines 6-433

**Issue**: Looking at `testCommand` signature (line 6-9):
```typescript
export async function testCommand<TOptions extends Options = Options>(
  command: Command<TOptions>,
  options: TestOptions = {},
): Promise<TestResult>
```

And `TestOptions` (from types.ts) - looking at actual usage in test-command.ts:
- Line 351: `const rawFlags = options.flags || {};`
- The `flags` option is used to pass pre-validated flag values directly to the handler
- Line 373: `positional: options.args || [],` - args are CLI positional arguments, not parsed flags

The problem is that `flags` in `TestOptions` are passed directly to the handler as `resolvedFlags`, not processed through CLI parsing. But the way the docs show it (passing `{ name: "World" }` as flags) should work for `testCommand` since it directly injects flags.

**Actually**: The implementation does support `flags` directly (line 351-367). So the docs MAY be correct for simple cases. However, the docs show `flags: { name: "World" }` but this bypasses CLI parsing. For full CLI testing with argument parsing, use `createTestCLI` instead.

**Verdict**: Partially correct but potentially confusing - `testCommand` bypasses CLI argument parsing, while `createTestCLI` simulates real CLI invocation.

---

### [high] `testing.mdx` - `mockPromptResponses` usage with prompts doesn't match actual implementation

**Doc**: Lines 195-207
```typescript
test("init command with prompts", async () => {
  const result = await testCommand(init, {
    ...mockPromptResponses({
      "Enter project name:": "awesome-cli",
      "Use TypeScript?": "n",
      "Choose a template:": "full",
    }),
  });
```

**Source**: `packages/test/src/test-command.ts` lines 26-223

**Issue**: `mockPromptResponses` returns an object with `mockPrompts` property (from helpers.ts):
```typescript
export function mockPromptResponses(responses: Record<string, string | string[]>): TestOptions {
  return { mockPrompts: responses };
}
```

The keys in `mockPrompts` are matched against the message string passed to prompts. But in the doc example, prompts like `"Enter project name:"` would be matched, but looking at the actual prompt implementation in `packages/runtime/src/prompt/index.ts`, the actual messages shown to users include formatting like `"? Enter project name: "` (see line 411 formatQuestionLabel adds `"? "` prefix).

The mock system uses exact string matching (line 36: `mockPromptsMap[message]`), so the documentation's example keys may not match actual prompt messages.

**Fix**: Document should show that prompt message matching is exact, including any prefix/suffix formatting, or show how to use regex matching.

---

### [high] `dev-server.mdx` - Plugin store access pattern is unclear

**Doc**: Lines 165-180
```typescript
handler: async ({ flags, context, spinner, colors }) => {
  // Access plugin context
  if (context?.store.metrics) {
    context.store.metrics.recordEvent("server_started", { port, host });
  }
  if (context?.store.config) {
    console.log(colors.dim(`Config loaded: ${JSON.stringify(context.store.config, null, 2)}`));
  }
};
```

**Source**: `packages/core/src/plugin/context.ts` - CommandContext interface

**Issue**: The `context` property on `HandlerArgs` is typed as `CommandContext<Record<string, unknown>> | undefined` (types.ts line 206). But the actual CommandContext interface contains:
- `store: TStore` - the merged plugin store type
- The type parameter `TStore` comes from the plugins array passed to `createCLI`

If no plugins are loaded, `context` is `undefined`. The example shows accessing `context?.store.metrics` but:
1. The `metricsPlugin` in dev-server example is typed with a custom interface `MetricsStore` that contains a `metrics` property
2. Without proper type annotation, TypeScript wouldn't know `context.store.metrics` exists

**Fix**: The example should show proper typing:
```typescript
import type { MetricsStore } from "./plugins/metrics.js";
// Handler:
// context?.store is MergeStores<[typeof metricsPlugin, typeof configPlugin, ...]>
```

---

### [high] `generated-types.mdx` - Incorrect description of default behavior

**Doc**: Lines 20-32
```typescript
// cli.ts
import { createCLI } from "@bunli/core";

const cli = await createCLI({
  name: "my-cli",
  version: "1.0.0",
});
```

**Issue**: The documentation says "Generated types are always created at `./.bunli/commands.gen.ts`" but looking at `packages/core/src/cli.ts` line 194-207, the auto-loading of generated types:
1. Attempts to import `./.bunli/commands.gen.ts` as a side-effect
2. If the file doesn't exist, it silently continues (line 206: `logger.debug("Could not load generated types from %s: %O", generatedPath, error);`)

The generated file must exist - it's not "always created" by `createCLI`. The generator package (`@bunli/generator`) creates it via `bunli generate` or `bunli dev`.

**Fix**: Clarify that type generation requires running `bunli generate` or `bunli dev`, and `createCLI` auto-loads the generated file if it exists.

---

### [medium] `building-your-first-cli.mdx` - Multi-line input note is outdated

**Doc**: Lines 154-168
```typescript
export default defineCommand({
  name: "note",
  handler: async ({ prompt }) => {
    const content = await prompt("Enter your note (Ctrl+D to finish):", {
      multiline: true,
    });
    console.log("Note saved with", content.split("\n").length, "lines");
  },
});
```

**Source**: `packages/runtime/src/prompt/index.ts` - `text()` function

**Issue**: Line 155-156 says "Note: Bunli's `prompt()` currently captures a single line of input." But looking at `text()` function (line 1651-1689), it does support `multiline: true` option. However, the actual implementation uses `askLine` (line 326) which only reads single lines from readline.

The multiline feature may work differently than described - checking if the multiline option actually enables multi-line input or if it's a placeholder.

**Fix**: Verify multiline implementation and either fix docs or fix implementation.

---

### [medium] `interactive-prompts.mdx` - Multi-select API differs from documented

**Doc**: Lines 303-316
```typescript
const features = await prompt.multiselect("Select features to install:", {
  options: [...],
  initialValues: ["auth", "db"],
  min: 1,
  max: 4,
});
```

**Source**: `packages/runtime/src/prompt/index.ts` - `multiselect()` function signature (line 1759-1794)

**Issue**: The actual `MultiSelectOptions` interface (lines 58-65) shows:
```typescript
export interface MultiSelectOptions<T = string> extends BasePromptOptions<T[]> {
  options: SelectOption<T>[];
  min?: number;
  max?: number;
  initialValues?: T[];
  ordered?: boolean;
  height?: number;
}
```

The `min` and `max` are correctly documented. However, the return type is `Promise<T[]>` but with `Cancel` handling. If user cancels, it throws `PromptCancelledError` (via `cancelAndThrow()` at line 1776).

**Fix**: Document that multiselect throws on cancel.

---

### [medium] `schema-validation.mdx` - Object validation example may not work as shown

**Doc**: Lines 254-265
```typescript
config: option(
  z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(
      z.object({
        host: z.string(),
        port: z.number(),
        ssl: z.boolean().optional(),
      }),
    ),
),
```

**Issue**: The transform + pipe pattern is valid Zod, but the `--config` flag would receive a JSON string from CLI. However, `option()` takes a schema and the CLI parsing validates against it. The issue is that the schema is `z.string().transform(...).pipe(...)` - when CLI passes `"{\"host\":\"localhost\",\"port\":3000}"`, it first validates as string, then transforms, then pipes to object.

This should work, but error messages may be confusing when JSON parsing fails.

**Verdict**: Mostly correct but could use better error handling example.

---

### [medium] `dev-server.mdx` - Custom plugin example has type issues

**Doc**: Lines 93-158 (metricsPlugin)

**Source**: `packages/core/src/plugin/create.ts` and `packages/core/src/plugin/types.ts`

**Issue**: The `MetricsStore` interface is defined inline with methods (`recordEvent`, `getEvents`, `clearEvents`) but the `store` property in `createPlugin` is typed as simple object, not interface with methods. The example shows:
```typescript
store: {
  metrics: {
    events: [],
    recordEvent(name: string, data: Record<string, any> = {}) { ... },
    getEvents(name?: string) { ... },
    clearEvents() { ... },
  },
},
```

This works at runtime but the type inference may not properly capture the method signatures. The `BunliPlugin<TStore>` interface expects `store: TStore` where `TStore` is the generic parameter.

**Fix**: Show proper interface definition:
```typescript
interface MetricsStore {
  metrics: {
    events: Array<{ name: string; timestamp: Date; data: Record<string, any> }>;
    recordEvent: (name: string, data?: Record<string, any>) => void;
    getEvents: (name?: string) => Array<{ name: string; timestamp: Date; data: Record<string, any> }>;
    clearEvents: () => void;
  };
}
```

---

### [medium] `testing.mdx` - `expectCommand` custom matcher usage is partially documented

**Doc**: Lines 420-435
```typescript
import { expectCommand } from "@bunli/test";

test("command succeeds", async () => {
  const result = await testCommand(myCommand);
  expectCommand(result).toHaveSucceeded();
  expectCommand(result).toContainInStdout("success");
});
```

**Source**: `packages/test/src/matchers.ts`

**Issue**: Looking at the actual matchers implementation, `expectCommand` returns a matcher object with methods like `toHaveSucceeded()`, `toHaveFailed()`, `toContainInStdout()`, etc. The docs are correct but don't mention that these are custom Bun test matchers that must be used with `expect`.

**Verdict**: Correct as shown.

---

### [low] `building-your-first-cli.mdx` - Configuration example shows `build.targets` as array of strings

**Doc**: Lines 331-338
```typescript
build: {
  targets: ["darwin-arm64", "linux-x64", "windows-x64"],
},
```

**Source**: `packages/core/src/config.ts` line 66

**Issue**: Valid, but the actual config schema also accepts targets as strings and does default to empty array. The docs are correct but could note that targets can be `["native"]` for current platform compile.

**Verdict**: Correct.

---

### [low] `tui-gallery.mdx` - Minor accuracy issue

**Doc**: Line 29
```bash
bun run dev gallery
```

**Source**: Check if `dev` script supports a gallery argument

**Issue**: The docs say to run `bun run dev gallery` but it's unclear if the `dev` command accepts arguments this way. The example shows `bun cli.ts gallery --theme light` as the direct approach.

**Verdict**: Minor - the direct approach is clearer.

---

### [low] `git-tool.mdx` - Shell command syntax in docs may not match Bun.$ behavior

**Doc**: Lines 144-162
```typescript
handler: async ({ shell, colors, spinner }) => {
  await shell`git pull origin main`;
  await shell`git push origin main`;
}
```

**Source**: `Bun.$` template literal syntax

**Issue**: The docs are correct for Bun.$ template literal usage. However, the docs don't explain that:
1. Shell commands return a `ShellPromise` with `.text()`, `.json()`, `.quiet()` methods
2. Error handling requires try/catch
3. In test environment, shell is mocked

**Verdict**: Correct but could use more context.

---

### [low] `examples/hello-world.mdx` - Uses JSX in `.tsx` file correctly

**Doc**: Line 23
```typescript
// commands/greet.tsx
```

**Source**: Actual file is `examples/hello-world/commands/greet.tsx`

**Verdict**: Correct - JSX requires `.tsx` extension.

---

## Summary

| Severity | Count | Issues |
|----------|-------|--------|
| critical | 2 | `prompt.text()` doesn't exist, `getCommandApi` etc don't exist in core |
| high | 4 | testCommand API usage, mockPromptResponses matching, plugin store access, generated types description |
| medium | 5 | multiline implementation, multiselect cancel behavior, object validation, plugin typing, matcher usage |
| low | 5 | Minor clarifications needed |

## Recommended Fixes (Priority Order)

1. **Fix `interactive-prompts.mdx`**: Remove `prompt.text()` usage, show correct `prompt("message")` pattern
2. **Fix `type-generation.mdx`**: Clarify that helper functions come from generated file, not from `@bunli/core` directly
3. **Update `testing.mdx`**: Clarify testCommand vs createTestCLI, fix mockPromptResponses key matching
4. **Update `dev-server.mdx`**: Show proper plugin store typing
5. **Update `generated-types.mdx`**: Clarify that types must be generated via `bunli generate`