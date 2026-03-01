# Plugin System

## BunliPlugin interface

```typescript
interface BunliPlugin<TStore = {}> {
  name: string
  version?: string
  store?: TStore

  setup?(context: PluginContext): void | Promise<void>
  configResolved?(config: ResolvedConfig): void | Promise<void>
  beforeCommand?(context: CommandContext<any>): void | Promise<void>
  afterCommand?(context: CommandContext<any> & CommandResult): void | Promise<void>
}
```

## Plugin context (setup phase)

```typescript
interface PluginContext {
  readonly config: BunliConfigInput
  updateConfig(partial: Partial<BunliConfigInput>): void
  registerCommand(command: CommandDefinition): void
  use(middleware: Middleware): void
  readonly store: Map<string, unknown>
  readonly logger: Logger
  readonly paths: PathInfo // cwd, home, config
}
```

`setup` store is a shared `Map<string, unknown>` for plugin setup coordination.

## Command context (execution phase)

```typescript
interface CommandContext<TStore = {}> {
  readonly command: string
  readonly commandDef: Command<any, TStore>
  readonly args: string[]
  readonly flags: Record<string, unknown>
  readonly env: EnvironmentInfo
  readonly store: TStore
  getStoreValue<K extends keyof TStore>(key: K): TStore[K]
  setStoreValue<K extends keyof TStore>(key: K, value: TStore[K]): void
  hasStoreValue<K extends keyof TStore>(key: K): boolean
}
```

Execution `store` is a typed object copied from merged plugin stores for each command run.

`EnvironmentInfo` base field is `isCI`; additional fields like `isAIAgent`/`aiAgents` come from plugins (for example `@bunli/plugin-ai-detect`).

## Creating plugins

```typescript
import { createPlugin } from "@bunli/core/plugin"

const myPlugin = createPlugin({
  name: "my-plugin",
  store: { count: 0 },
  beforeCommand(context) {
    context.store.count++
  }
})

const myFactoryPlugin = createPlugin((options: { prefix: string }) => ({
  name: "my-factory-plugin",
  beforeCommand(context) {
    console.log(`${options.prefix}: ${context.command}`)
  }
}))
```

## Plugin configuration

```typescript
export default defineConfig({
  plugins: [
    "@bunli/plugin-ai-detect",
    myPlugin,
    [completionsPlugin, { generatedPath: ".bunli/commands.gen.ts" }]
  ]
})
```
