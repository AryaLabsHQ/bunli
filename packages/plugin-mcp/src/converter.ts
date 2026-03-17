/**
 * MCP Tool to Bunli Command converter
 *
 * This is the core transformation layer - converts MCP tool schemas
 * into Bunli commands. No SDK dependency, just pure transformation.
 */

import { option, type Command, type CLIOption, type Options } from '@bunli/core'
import { Result } from 'better-result'
import type { MCPTool, ConvertOptions, MCPCommand } from './types.js'
import { ConvertToolsError } from './errors.js'
import { jsonSchemaToZodSchema } from './schema-to-zod.js'
import { toCommandName, toFlagName } from './utils.js'

/**
 * Convert MCP tools to Bunli commands
 *
 * This is the main entry point for the plugin. Takes an array of MCP tool
 * objects (fetched by your MCP client) and converts them to Bunli commands.
 *
 * @example
 * ```typescript
 * // Fetch tools from your MCP client
 * const tools = await yourMcpClient.listTools()
 *
 * // Convert to Bunli commands
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
 */
export function createCommandsFromMCPTools<TStore = Record<string, unknown>>(
  tools: MCPTool[],
  options: ConvertOptions<TStore>
): Result<MCPCommand<TStore>[], ConvertToolsError> {
  const commands: MCPCommand<TStore>[] = []

  for (const tool of tools) {
    const converted = convertToolToCommand(tool, options)
    if (Result.isError(converted)) {
      return converted
    }
    commands.push(converted.value)
  }

  return Result.ok(commands)
}

/**
 * Convert a single MCP tool to a Bunli command
 */
function convertToolToCommand<TStore>(
  tool: MCPTool,
  options: ConvertOptions<TStore>
): Result<MCPCommand<TStore>, ConvertToolsError> {
  const {
    namespace,
    createHandler,
    commandName: customCommandName,
    flagName: customFlagName
  } = options

  // Generate command name
  const commandName = customCommandName
    ? customCommandName(tool.name)
    : toCommandName(tool.name, namespace)

  // Convert input schema to Bunli options
  const bunliOptionsResult = convertInputSchemaToOptions(
    tool.name,
    tool.inputSchema,
    customFlagName || toFlagName
  )
  if (Result.isError(bunliOptionsResult)) {
    return bunliOptionsResult
  }

  // Create the command
  const command: MCPCommand<TStore> = {
    name: commandName,
    description: tool.description || `Invoke MCP tool: ${tool.name}`,
    options: bunliOptionsResult.value,
    handler: createHandler(tool.name)
  }

  return Result.ok(command)
}

/**
 * Convert MCP inputSchema to Bunli options
 */
function convertInputSchemaToOptions(
  toolName: string,
  inputSchema: MCPTool['inputSchema'],
  flagNameTransform: (name: string) => string
): Result<Options, ConvertToolsError> {
  const bunliOptions: Options = {}

  if (!inputSchema?.properties) {
    return Result.ok(bunliOptions)
  }

  const requiredFields = new Set(inputSchema.required || [])

  for (const [propName, propSchema] of Object.entries(inputSchema.properties)) {
    // Convert JSON Schema to Zod
    const schemaResult = jsonSchemaToZodSchema(propSchema, { coerce: true })
    if (Result.isError(schemaResult)) {
      return Result.err(
        new ConvertToolsError({
          toolName,
          message: `Failed to convert input schema field "${propName}" for tool "${toolName}"`,
          cause: schemaResult.error
        })
      )
    }
    let zodSchema = schemaResult.value

    // Apply default if present
    if (propSchema.default !== undefined) {
      zodSchema = zodSchema.default(propSchema.default)
    }

    // Make optional if not required
    if (!requiredFields.has(propName)) {
      zodSchema = zodSchema.optional()
    }

    // Convert property name to flag name
    const flagName = flagNameTransform(propName)

    // Extract short option from description if present (e.g., "[-t] Title")
    const shortMatch = propSchema.description?.match(/^\[-([a-zA-Z])\]\s*/)
    const short = shortMatch ? shortMatch[1] : undefined
    const description = shortMatch
      ? propSchema.description?.slice(shortMatch[0].length)
      : propSchema.description

    // Create CLI option
    bunliOptions[flagName] = option(zodSchema, {
      description,
      short
    })
  }

  return Result.ok(bunliOptions)
}

/**
 * Convert a single MCP tool to command metadata (for codegen)
 *
 * Returns metadata that can be used to generate TypeScript types
 * without creating the full command object.
 */
export interface MCPCommandMetadata {
  name: string
  toolName: string
  namespace?: string
  description?: string
  options: Record<string, {
    type: string
    required: boolean
    description?: string
    short?: string
    enumValues?: Array<string | number>
    minimum?: number
    maximum?: number
    hasDefault?: boolean
    default?: unknown
  }>
}

export function extractCommandMetadata(
  tool: MCPTool,
  namespace?: string,
  flagNameTransform: (name: string) => string = toFlagName
): MCPCommandMetadata {
  const commandName = toCommandName(tool.name, namespace)

  const optionsMeta: MCPCommandMetadata['options'] = {}

  if (tool.inputSchema?.properties) {
    const requiredFields = new Set(tool.inputSchema.required || [])

    for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
      const flagName = flagNameTransform(propName)
      const schemaType = Array.isArray(propSchema.type) ? propSchema.type[0] : propSchema.type

      // Extract short option
      const shortMatch = propSchema.description?.match(/^\[-([a-zA-Z])\]\s*/)
      const short = shortMatch ? shortMatch[1] : undefined
      const description = shortMatch
        ? propSchema.description?.slice(shortMatch[0].length)
        : propSchema.description

      optionsMeta[flagName] = {
        type: schemaType || 'unknown',
        required: requiredFields.has(propName) && propSchema.default === undefined,
        description,
        short,
        hasDefault: propSchema.default !== undefined,
        default: propSchema.default
      }

      // Add constraints
      if (propSchema.enum) {
        optionsMeta[flagName]!.enumValues = propSchema.enum.filter(
          (v): v is string | number => typeof v === 'string' || typeof v === 'number'
        )
      }
      if (propSchema.minimum !== undefined) {
        optionsMeta[flagName]!.minimum = propSchema.minimum
      }
      if (propSchema.maximum !== undefined) {
        optionsMeta[flagName]!.maximum = propSchema.maximum
      }
    }
  }

  return {
    name: commandName,
    toolName: tool.name,
    namespace,
    description: tool.description,
    options: optionsMeta
  }
}
