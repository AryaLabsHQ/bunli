/**
 * MCP Plugin for Bunli
 *
 * Thin wrapper around the converter for the Bunli plugin pattern.
 * Provides dynamic command registration from MCP tool schemas.
 */

import { createPlugin } from '@bunli/core/plugin'
import type { BunliPlugin } from '@bunli/core/plugin'
import { Result } from 'better-result'
import type { McpPluginOptions, McpPluginStore, MCPToolGroup } from './types.js'
import { createCommandsFromMCPTools } from './converter.js'
import { generateMCPTypes } from './codegen.js'
import { McpToolsProviderError } from './errors.js'

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
      const toolGroupsResult = await Result.tryPromise({
        try: async () => options.toolsProvider(context),
        catch: (cause) =>
          new McpToolsProviderError({
            message: 'Failed to fetch MCP tools from toolsProvider',
            cause
          })
      })
      if (Result.isError(toolGroupsResult)) {
        context.logger.warn(toolGroupsResult.error.message)
        return
      }
      const toolGroups: MCPToolGroup[] = toolGroupsResult.value

      // Track registered commands
      const registeredCommands: McpPluginStore['commands'] = []

      // Convert and register commands for each group
      for (const { namespace, tools } of toolGroups) {
        if (!tools || tools.length === 0) {
          context.logger.debug(`No tools found for namespace: ${namespace}`)
          continue
        }

        // Convert tools to commands
        const commandsResult = createCommandsFromMCPTools<TStore>(tools, {
          namespace,
          createHandler: (toolName) => options.createHandler(namespace, toolName)
        })
        if (Result.isError(commandsResult)) {
          context.logger.warn(commandsResult.error.message)
          continue
        }
        const commands = commandsResult.value

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

        const typegenResult = await generateMCPTypes({
          tools: toolGroups,
          outputDir
        })
        if (Result.isError(typegenResult)) {
          context.logger.warn(typegenResult.error.message)
        } else {
          context.logger.debug(`Generated MCP types in ${outputDir}`)
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
