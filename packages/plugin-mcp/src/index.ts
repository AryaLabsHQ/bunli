/**
 * @bunli/plugin-mcp
 *
 * MCP (Model Context Protocol) plugin for Bunli - create CLI commands from MCP tool schemas.
 *
 * @example Command generation with builder (CLI codegen):
 * ```typescript
 * import { Commands } from '@bunli/plugin-mcp'
 *
 * // Use the builder to generate command code
 * const builder = Commands.from(tools)
 *   .namespace('exa')
 *   .timeout(30000)
 *
 * // Inject into your template
 * const code = template
 *   .replace('{{COMMANDS}}', builder.commands())
 *   .replace('{{REGISTRATIONS}}', builder.registrations())
 * ```
 *
 * @example Runtime usage with createCommandsFromMCPTools:
 * ```typescript
 * import { createCommandsFromMCPTools } from '@bunli/plugin-mcp'
 *
 * const commands = createCommandsFromMCPTools(tools, {
 *   namespace: 'linear',
 *   createHandler: (toolName) => async ({ flags }) => {
 *     return yourMcpClient.call(toolName, flags)
 *   }
 * })
 *
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
 *       }
 *     })
 *   ]
 * })
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────
// Builder API (primary for CLI codegen)
// ─────────────────────────────────────────────────────────
export { CommandBuilder, Commands } from './builder.js'

// ─────────────────────────────────────────────────────────
// Runtime API (for plugin usage)
// ─────────────────────────────────────────────────────────
export { createCommandsFromMCPTools, extractCommandMetadata } from './converter.js'
export type { MCPCommandMetadata } from './converter.js'

// Plugin wrapper
export { mcpPlugin, default } from './plugin.js'

// Type generation
export { generateMCPTypes } from './codegen.js'

// ─────────────────────────────────────────────────────────
// Utilities (for custom implementations)
// ─────────────────────────────────────────────────────────

// Schema conversion
export { jsonSchemaToZodSchema, extractSchemaMetadata } from './schema-to-zod.js'
export type { SchemaConversionOptions, SchemaMetadata } from './schema-to-zod.js'
export {
  SchemaConversionError,
  ConvertToolsError,
  GenerateMCPTypesError,
  McpToolsProviderError
} from './errors.js'

// Naming utilities
export {
  toKebabCase,
  toCommandName,
  toFlagName,
  toPascalCase,
  toCamelCase,
  escapeString
} from './utils.js'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
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
