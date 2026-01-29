/**
 * MCP Plugin for Bunli
 *
 * Thin wrapper around the converter for the Bunli plugin pattern.
 * Provides dynamic command registration from MCP tool schemas.
 */

import { createPlugin } from '@bunli/core/plugin'
import type { BunliPlugin } from '@bunli/core/plugin'
import type { McpPluginOptions, McpPluginStore, MCPToolGroup } from './types.js'
import { createCommandsFromMCPTools } from './converter.js'
import { generateMCPTypes } from './codegen.js'

/**
 * Create MCP plugin for dynamic command registration
 *
 * This plugin fetches tools from your MCP client(s) during setup and
 * registers them as Bunli commands. Optionally generates TypeScript
 * types for enhanced DX.
 *
 * @example
 * ```typescript
 * const cli = await createCLI({
 *   name: 'my-cli',
 *   plugins: [
 *     mcpPlugin({
 *       toolsProvider: async (context) => {
 *         // Your logic to fetch tools
 *         const tools = await yourClient.listTools()
 *         return [{ namespace: 'server', tools }]
 *       },
 *       createHandler: (namespace, toolName) => async ({ flags }) => {
 *         return yourClient.callTool(toolName, flags)
 *       },
 *       sync: true // Enable type generation
 *     })
 *   ]
 * })
 * ```
 */
export function mcpPlugin<TStore = Record<string, unknown>>(
  options: McpPluginOptions<TStore>
): BunliPlugin<McpPluginStore> {
  return createPlugin<McpPluginStore>({
    name: '@bunli/plugin-mcp',
    version: '0.1.0',

    store: {
      commands: []
    },

    async setup(context) {
      // Fetch tools from user's provider
      let toolGroups: MCPToolGroup[]
      try {
        toolGroups = await options.toolsProvider(context as any)
      } catch (error) {
        context.logger.warn(`Failed to fetch MCP tools: ${error}`)
        return
      }

      // Track registered commands
      const registeredCommands: McpPluginStore['commands'] = []

      // Convert and register commands for each group
      for (const { namespace, tools } of toolGroups) {
        if (!tools || tools.length === 0) {
          context.logger.debug(`No tools found for namespace: ${namespace}`)
          continue
        }

        // Convert tools to commands
        const commands = createCommandsFromMCPTools(tools, {
          namespace,
          createHandler: (toolName) => options.createHandler(namespace, toolName)
        })

        // Register each command
        for (const cmd of commands) {
          context.registerCommand(cmd)
          registeredCommands.push({
            namespace,
            toolName: cmd.name.includes(':')
              ? cmd.name.split(':').slice(1).join(':')
              : cmd.name,
            commandName: cmd.name
          })
        }

        context.logger.debug(
          `Registered ${commands.length} MCP commands for namespace: ${namespace}`
        )
      }

      // Update store
      context.store.set('@bunli/plugin-mcp:commands', registeredCommands)

      // Optional type generation
      if (options.sync && toolGroups.length > 0) {
        const outputDir = typeof options.sync === 'object'
          ? options.sync.outputDir || '.bunli'
          : '.bunli'

        try {
          await generateMCPTypes({
            tools: toolGroups,
            outputDir
          })
          context.logger.debug(`Generated MCP types in ${outputDir}`)
        } catch (error) {
          context.logger.warn(`Failed to generate MCP types: ${error}`)
        }
      }

      context.logger.info(
        `MCP plugin loaded ${registeredCommands.length} commands from ${toolGroups.length} server(s)`
      )
    }
  })
}

/**
 * Default export for convenience
 */
export default mcpPlugin
