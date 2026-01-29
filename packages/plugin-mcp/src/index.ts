/**
 * @bunli/plugin-mcp
 *
 * MCP (Model Context Protocol) plugin for Bunli - create CLI commands from MCP tool schemas.
 *
 * @example Basic usage with createCommandsFromMCPTools:
 * ```typescript
 * import { createCommandsFromMCPTools } from '@bunli/plugin-mcp'
 *
 * // Your MCP tools (fetched from listTools())
 * const tools = [
 *   {
 *     name: 'create_issue',
 *     description: 'Create a new issue',
 *     inputSchema: {
 *       type: 'object',
 *       properties: {
 *         title: { type: 'string', description: 'Issue title' },
 *         priority: { type: 'integer', minimum: 0, maximum: 4 }
 *       },
 *       required: ['title']
 *     }
 *   }
 * ]
 *
 * const commands = createCommandsFromMCPTools(tools, {
 *   namespace: 'linear',
 *   createHandler: (toolName) => async ({ flags }) => {
 *     return yourMcpClient.call(toolName, flags)
 *   }
 * })
 *
 * // Register with CLI
 * commands.forEach(cmd => cli.command(cmd))
 * ```
 *
 * @example As a plugin:
 * ```typescript
 * import { mcpPlugin } from '@bunli/plugin-mcp'
 *
 * const cli = await createCLI({
 *   name: 'my-cli',
 *   plugins: [
 *     mcpPlugin({
 *       toolsProvider: async (context) => {
 *         const tools = await yourClient.listTools()
 *         return [{ namespace: 'server', tools }]
 *       },
 *       createHandler: (namespace, toolName) => async ({ flags }) => {
 *         return yourClient.callTool(toolName, flags)
 *       },
 *       sync: true // Optional: generate TypeScript types
 *     })
 *   ]
 * })
 * ```
 *
 * @packageDocumentation
 */

// Core converter (primary API)
export { createCommandsFromMCPTools, extractCommandMetadata } from './converter.js'
export type { MCPCommandMetadata } from './converter.js'

// Plugin wrapper
export { mcpPlugin, default } from './plugin.js'

// Type generation
export { generateMCPTypes } from './codegen.js'

// Schema conversion utilities
export { jsonSchemaToZodSchema, extractSchemaMetadata } from './schema-to-zod.js'
export type { SchemaConversionOptions, SchemaMetadata } from './schema-to-zod.js'

// Naming utilities
export {
  toKebabCase,
  toCommandName,
  toFlagName,
  toPascalCase,
  toCamelCase,
  escapeString
} from './utils.js'

// Types
export type {
  MCPTool,
  MCPToolInputSchema,
  MCPToolGroup,
  MCPCommand,
  ConvertOptions,
  McpPluginOptions,
  McpPluginStore,
  GenerateTypesOptions,
  GeneratedMCPCommandMeta,
  JSONSchema7,
  JSONSchema7Type
} from './types.js'
