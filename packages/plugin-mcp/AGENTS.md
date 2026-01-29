# @bunli/plugin-mcp

**MCP (Model Context Protocol) plugin for Bunli - create CLI commands from MCP tool schemas.**

## OVERVIEW

Converts MCP tool schemas into type-safe Bunli CLI commands. This is NOT a generic "JSON Schema → CLI" converter - it specifically supports the MCP tool schema format established by the Model Context Protocol.

Key principle: **The plugin does NOT manage MCP connections**. It's a pure transformation layer that takes tool schemas (you fetch them) and outputs Bunli commands.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Convert tools to commands | `src/converter.ts` → `createCommandsFromMCPTools()` |
| JSON Schema → Zod | `src/schema-to-zod.ts` → `jsonSchemaToZodSchema()` |
| Plugin wrapper | `src/plugin.ts` → `mcpPlugin()` |
| Type generation | `src/codegen.ts` → `generateMCPTypes()` |
| Naming utilities | `src/utils.ts` → `toKebabCase()`, `toCommandName()` |
| Type definitions | `src/types.ts` |

## PATTERNS

### Primary API: `createCommandsFromMCPTools()`

The main entry point. Takes MCP tools and returns Bunli commands:

```typescript
import { createCommandsFromMCPTools } from '@bunli/plugin-mcp'

const commands = createCommandsFromMCPTools(tools, {
  namespace: 'server-name',  // optional prefix
  createHandler: (toolName) => async ({ flags }) => {
    // YOUR logic to call the MCP tool
    return yourClient.callTool(toolName, flags)
  }
})

commands.forEach(cmd => cli.command(cmd))
```

### Plugin API: `mcpPlugin()`

Wraps the converter for Bunli's plugin system:

```typescript
mcpPlugin({
  toolsProvider: async (context) => [
    { namespace: 'linear', tools: await linearClient.listTools() }
  ],
  createHandler: (namespace, toolName) => async ({ flags }) => {
    // ...
  },
  sync: true  // optional type generation
})
```

### Type Generation

Generates `.bunli/mcp-{namespace}.gen.ts` files with:
- Zod schemas for each command's options
- TypeScript types inferred from schemas
- Module augmentation for `RegisteredCommands`

## NAMING CONVENTIONS

| MCP Format | CLI Format | Example |
|------------|------------|---------|
| Tool name | Command name | `create_issue` → `linear:create-issue` |
| Property name | Flag name | `teamId` → `--team-id` |
| camelCase | kebab-case | `issueTitle` → `--issue-title` |

## DEPENDENCIES

- `@bunli/core` - workspace dependency
- `zod` - peer dependency (for schema conversion)

**Intentionally NOT dependent on:**
- `@modelcontextprotocol/sdk` - callers handle connections

## ANTI-PATTERNS

- Using this plugin to manage MCP connections (use mcp-exec/mcporter)
- Expecting full JSON Schema validation (only MCP-relevant subset)
- Modifying generated files (they're overwritten)

## TESTING

```bash
bun test packages/plugin-mcp/test/
```

Test files:
- `schema-to-zod.test.ts` - JSON Schema conversion
- `converter.test.ts` - Tool to command transformation
- `fixtures/` - Mock MCP tool schemas
