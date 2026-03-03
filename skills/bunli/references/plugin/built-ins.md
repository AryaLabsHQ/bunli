# Built-in Plugins

## @bunli/plugin-ai-detect

Detects AI coding assistants from environment variables.

```typescript
import { aiAgentPlugin } from "@bunli/plugin-ai-detect"

const plugin = aiAgentPlugin()
```

Adds AI-related fields via plugin augmentation (`context.env.isAIAgent`, `context.env.aiAgents`) and can also project data into plugin store.

## @bunli/plugin-completions

Generates shell completions.

```typescript
import { completionsPlugin } from "@bunli/plugin-completions"

const plugin = completionsPlugin({
  generatedPath: ".bunli/commands.gen.ts",
  commandName: "mycli",
  executable: "mycli",
  includeAliases: true,
  includeGlobalFlags: true
})
```

Note: package name is `@bunli/plugin-completions`, while the registered runtime plugin name is `completions`.

## @bunli/plugin-config

Loads config from multiple sources with merging.

```typescript
import { configMergerPlugin } from "@bunli/plugin-config"

const plugin = configMergerPlugin({
  sources: [
    "~/.config/{{name}}/config.json",
    ".{{name}}rc",
    ".{{name}}rc.json",
    ".config/{{name}}.json"
  ],
  mergeStrategy: "deep"
})
```

## @bunli/plugin-mcp

Converts MCP tools to CLI commands.

```typescript
import { mcpPlugin } from "@bunli/plugin-mcp"

const plugin = mcpPlugin({
  toolsProvider: async () => [
    {
      namespace: "server",
      tools: [{ name: "tool1", description: "...", inputSchema: { type: "object" } }]
    }
  ],
  createHandler: (namespace, toolName) => async ({ flags }) => {
    return mcpClient.callTool(`${namespace}:${toolName}`, flags)
  },
  sync: { outputDir: ".bunli" } // or sync: true
})
```

`sync` accepts:
- `true` (default output dir `.bunli`)
- `{ outputDir?: string }`

## Plugin composition

```typescript
import { composePlugins } from "@bunli/core/plugin"

const app = composePlugins(
  aiAgentPlugin(),
  configMergerPlugin({ sources: [] }),
  completionsPlugin(),
  mcpPlugin({ toolsProvider, createHandler })
)
```
