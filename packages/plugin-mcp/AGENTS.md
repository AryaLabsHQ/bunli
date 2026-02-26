# @bunli/plugin-mcp

**MCP (Model Context Protocol) plugin - create CLI commands from MCP tool schemas.**

## OVERVIEW

Converts MCP tool schemas into type-safe Bunli CLI commands.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Convert tools | `src/converter.ts` |
| Schema → Zod | `src/schema-to-zod.ts` |
| Plugin wrapper | `src/plugin.ts` |
| Type generation | `src/codegen.ts` |

## PATTERNS

```typescript
import { createCommandsFromMCPTools } from '@bunli/plugin-mcp'

const commands = createCommandsFromMCPTools(tools, {
  namespace: 'server-name',
  createHandler: (toolName) => async ({ flags }) => {
    return yourClient.callTool(toolName, flags)
  }
})
```

**Key principle**: Plugin does NOT manage MCP connections - it's a pure transformation layer.
