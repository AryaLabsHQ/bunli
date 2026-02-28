# Plugin System

## BunliPlugin Interface

```typescript
interface BunliPlugin<TStore = {}> {
  name: string              // Unique plugin name (required)
  version?: string          // Optional version
  store?: TStore           // Initial store state

  // Lifecycle hooks
  setup?(context: PluginContext): void | Promise<void>
  configResolved?(config: ResolvedConfig): void | Promise<void>
  beforeCommand?(context: CommandContext<any>): void | Promise<void>
  afterCommand?(context: CommandContext<any> & CommandResult): void | Promise<void>
}
```

## Plugin Context (Setup)

```typescript
interface PluginContext {
  readonly config: BunliConfigInput
  updateConfig(partial: Partial<BunliConfigInput>): void
  registerCommand(command: CommandDefinition): void
  use(middleware: Middleware): void
  readonly store: Map<string, unknown>
  readonly logger: Logger
  readonly paths: PathInfo  // cwd, home, config
}
```

## Command Context

```typescript
interface CommandContext<TStore = {}> {
  readonly command: string
  readonly commandDef: Command<any, TStore>
  readonly args: string[]
  readonly flags: Record<string, any>
  readonly env: EnvironmentInfo  // isCI (isAIAgent, aiAgents added by @bunli/plugin-ai-detect)
  readonly store: TStore
  getStoreValue<K extends keyof TStore>(key: K): TStore[K]
  setStoreValue<K extends keyof TStore>(key: K, value: TStore[K]): void
  hasStoreValue<K extends keyof TStore>(key: K): boolean
}
```

## Creating Plugins

```typescript
import { createPlugin } from "@bunli/core/plugin"

// Direct plugin
const myPlugin = createPlugin({
  name: "my-plugin",
  store: { count: 0 },
  beforeCommand(context) {
    context.store.count++
  }
})

// Factory pattern
const myPlugin = createPlugin((options: { prefix: string }) => ({
  name: "my-plugin",
  store: { count: 0 },
  beforeCommand(context) {
    console.log(`${options.prefix}: ${context.command}`)
  }
}))
```

## Plugin Configuration

```typescript
// bunli.config.ts
export default defineConfig({
  plugins: [
    // String path
    "@bunli/plugin-ai-detect",

    // Direct plugin
    myPlugin,

    // Factory with options
    [completionsPlugin, { generatedPath: "./completions" }]
  ]
})
```

## Lifecycle

```
CLI Start
  │
  ├─► loadPlugins()     Load all plugin configs
  ├─► runSetup()        Execute setup hooks
  ├─► configResolved()  Notify config finalized
  │
  └─► Command Loop
       ├─► beforeCommand()
       ├─► Execute command
       └─► afterCommand()
```
