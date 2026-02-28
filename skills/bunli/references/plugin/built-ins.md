# Built-in Plugins

## @bunli/plugin-ai-detect

Detects AI coding assistants from environment variables.

```typescript
import { aiAgentPlugin } from "@bunli/plugin-ai-detect"

// Usage
const plugin = aiAgentPlugin()

// Detected AI agents:
// - CLAUDECODE, CLAUDE_CODE
// - CURSOR_AGENT
// - CODEX_CI, CODEX_THREAD_ID, CODEX_SANDBOX
// - AMP_CURRENT_THREAD_ID or AGENT=amp
// - GEMINI_CLI
// - OPENCODE=1
```

Access in handler via `env`:
```typescript
handler: ({ env }) => {
  if (env.isAIAgent) {
    console.log("Running in AI:", env.aiAgents)
  }
}
```

## @bunli/plugin-completions

Generates shell completions.

```typescript
import { completionsPlugin } from "@bunli/plugin-completions"

const plugin = completionsPlugin({
  generatedPath: "./completions",
  commandName: "mycli",
  executable: "mycli",
  includeAliases: true,
  includeGlobalFlags: true
})

// Generates: bash, zsh, fish, powershell completions
```

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
  mergeStrategy: "deep",  // or "shallow"
})
```

Template variables:
- `{{name}}` - App name from config
- `~` - Home directory

## @bunli/plugin-mcp

Converts MCP tools to CLI commands.

```typescript
import { mcpPlugin } from "@bunli/plugin-mcp"

const plugin = mcpPlugin({
  toolsProvider: async (context) => [
    {
      namespace: "server",
      tools: [
        { name: "tool1", description: "...", inputSchema: {...} }
      ]
    }
  ],
  createHandler: (namespace, toolName) => async ({ flags }) => {
    return mcpClient.callTool(toolName, flags)
  },
  sync: true  // Generate TypeScript types
})

// Creates commands: server tool1, server tool2, ...
```

## Plugin Composition

```typescript
import { composePlugins } from "@bunli/core/plugin"

const app = composePlugins(
  aiAgentPlugin(),
  configMergerPlugin({ sources: [...] }),
  completionsPlugin(),
  myCustomPlugin()
)
```
