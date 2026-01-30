/**
 * Command Builder for MCP tools
 *
 * Fluent API for generating Bunli command code from MCP tool schemas.
 * Consumers own their templates - this just generates the commands.
 */

import type { MCPTool } from './types.js'
import { extractCommandMetadata, type MCPCommandMetadata } from './converter.js'
import { toPascalCase, escapeString, toCamelCase, toFlagName } from './utils.js'

/**
 * Builder options (internal state)
 */
interface BuilderOptions {
  namespace?: string
  timeout: number
  includeRaw: boolean
  includeTimeout: boolean
  includeOutput: boolean
}

/**
 * Command Builder - fluent API for generating command code
 *
 * @example
 * ```typescript
 * import { Commands } from '@bunli/plugin-mcp'
 *
 * const builder = Commands.from(tools)
 *   .namespace('exa')
 *   .timeout(30000)
 *
 * const code = template
 *   .replace('{{COMMANDS}}', builder.commands())
 *   .replace('{{REGISTRATIONS}}', builder.registrations())
 * ```
 */
export class CommandBuilder {
  private tools: MCPTool[]
  private opts: BuilderOptions = {
    timeout: 60000,
    includeRaw: true,
    includeTimeout: true,
    includeOutput: true,
  }

  constructor(tools: MCPTool[]) {
    this.tools = tools
  }

  /**
   * Create a new CommandBuilder from MCP tools
   */
  static from(tools: MCPTool[]): CommandBuilder {
    return new CommandBuilder(tools)
  }

  /**
   * Set namespace prefix for command names
   * @example 'exa' → commands become 'exa:web-search'
   */
  namespace(ns: string): this {
    this.opts.namespace = ns
    return this
  }

  /**
   * Set default timeout in milliseconds
   */
  timeout(ms: number): this {
    this.opts.timeout = ms
    return this
  }

  /**
   * Include --raw option for passing raw JSON arguments
   */
  includeRawOption(include: boolean): this {
    this.opts.includeRaw = include
    return this
  }

  /**
   * Include --timeout option on each command
   */
  includeTimeoutOption(include: boolean): this {
    this.opts.includeTimeout = include
    return this
  }

  /**
   * Include --output option for format selection (text|json|raw)
   */
  includeOutputOption(include: boolean): this {
    this.opts.includeOutput = include
    return this
  }

  /**
   * Generate command definition code for all tools
   *
   * @returns TypeScript code defining all commands
   */
  commands(): string {
    const usedVarNames = new Set<string>()
    return this.tools
      .map(tool => this.generateCommand(tool, usedVarNames))
      .join('\n\n')
  }

  /**
   * Generate cli.command() registration calls
   *
   * @returns TypeScript code for registering commands
   */
  registrations(): string {
    const usedVarNames = new Set<string>()
    return this.tools
      .map(tool => {
        const meta = extractCommandMetadata(tool, this.opts.namespace)
        const varName = this.generateUniqueVarName(meta.name, usedVarNames)
        return `  cli.command(${varName}Command)`
      })
      .join('\n')
  }

  /**
   * Get list of command variable names
   *
   * @returns Array of variable names like ['WebSearchCommand', 'CompanyResearchCommand']
   */
  commandNames(): string[] {
    const usedVarNames = new Set<string>()
    return this.tools.map(tool => {
      const meta = extractCommandMetadata(tool, this.opts.namespace)
      const varName = this.generateUniqueVarName(meta.name, usedVarNames)
      return `${varName}Command`
    })
  }

  /**
   * Get number of tools/commands
   */
  count(): number {
    return this.tools.length
  }

  /**
   * Get the configured timeout value
   */
  getTimeout(): number {
    return this.opts.timeout
  }

  // ─────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────

  private generateCommand(tool: MCPTool, usedVarNames: Set<string>): string {
    const meta = extractCommandMetadata(tool, this.opts.namespace)
    const varName = this.generateUniqueVarName(meta.name, usedVarNames)

    const options = this.generateOptions(tool, meta)
    const handler = this.generateHandler(tool, meta)

    return `const ${varName}Command = defineCommand({
  name: '${meta.name}',
  description: '${escapeString(meta.description || `Invoke the ${tool.name} tool`)}',
  options: {
${options}
  },
  handler: ${handler},
})`
  }

  private generateOptions(tool: MCPTool, meta: MCPCommandMetadata): string {
    const lines: string[] = []

    // Tool-specific options
    for (const [flagName, opt] of Object.entries(meta.options)) {
      const zodSchema = this.generateZodSchemaString(opt)
      const propName = this.findOriginalPropName(tool, flagName)
      const descPart = opt.description ? `description: '${escapeString(opt.description)}'` : ''
      const shortPart = opt.short ? `short: '${opt.short}'` : ''
      const optionParts = [descPart, shortPart].filter(Boolean).join(', ')

      lines.push(`    '${flagName}': option(${zodSchema}, { ${optionParts} }),`)
    }

    // Global options
    if (this.opts.includeRaw) {
      lines.push(`    'raw': option(z.string().optional(), { description: 'Raw JSON arguments' }),`)
    }
    if (this.opts.includeTimeout) {
      lines.push(`    'timeout': option(z.coerce.number().optional(), { description: 'Timeout in ms', short: 't' }),`)
    }
    if (this.opts.includeOutput) {
      lines.push(`    'output': option(z.enum(['text', 'json', 'raw']).optional(), { description: 'Output format', short: 'o' }),`)
    }

    return lines.join('\n')
  }

  private generateHandler(tool: MCPTool, meta: MCPCommandMetadata): string {
    const argMappings = Object.entries(meta.options)
      .map(([flagName]) => {
        const propName = this.findOriginalPropName(tool, flagName)
        return `      if (flags['${flagName}'] !== undefined) args['${propName}'] = flags['${flagName}']`
      })
      .join('\n')

    return `async ({ flags }) => {
    const timeout = flags.timeout ?? DEFAULT_TIMEOUT
    const format = flags.output ?? 'text'
    let args: Record<string, unknown> = {}
    if (flags.raw) {
      args = JSON.parse(flags.raw)
    } else {
${argMappings}
    }
    try {
      const result = await callTool('${tool.name}', args)
      printResult(result, format)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }`
  }

  private generateZodSchemaString(opt: MCPCommandMetadata['options'][string]): string {
    let schema: string

    // Handle enum types
    if (opt.enumValues && opt.enumValues.length > 0) {
      if (opt.enumValues.every((v): v is string => typeof v === 'string')) {
        const values = opt.enumValues.map(v => `'${escapeString(v as string)}'`).join(', ')
        schema = `z.enum([${values}])`
      } else {
        const literals = opt.enumValues
          .map(v => (typeof v === 'string' ? `z.literal('${escapeString(v)}')` : `z.literal(${v})`))
          .join(', ')
        schema = `z.union([${literals}])`
      }
    } else {
      // Handle base types
      switch (opt.type) {
        case 'string':
          schema = 'z.string()'
          break
        case 'number':
          schema = 'z.coerce.number()'
          break
        case 'integer':
          schema = 'z.coerce.number().int()'
          break
        case 'boolean':
          schema = 'z.boolean()'
          break
        case 'array':
          schema = 'z.string().transform(v => v.split(",").map(s => s.trim()))'
          break
        case 'object':
          schema = 'z.string().transform(v => JSON.parse(v))'
          break
        default:
          schema = 'z.unknown()'
      }
    }

    // Add constraints
    if (opt.minimum !== undefined) {
      schema += `.min(${opt.minimum})`
    }
    if (opt.maximum !== undefined) {
      schema += `.max(${opt.maximum})`
    }

    // Add default
    if (opt.hasDefault && opt.default !== undefined) {
      const defaultVal =
        typeof opt.default === 'string' ? `'${escapeString(opt.default)}'` : JSON.stringify(opt.default)
      schema += `.default(${defaultVal})`
    }

    // Make optional if not required
    if (!opt.required && !opt.hasDefault) {
      schema += '.optional()'
    }

    return schema
  }

  private generateUniqueVarName(commandName: string, usedNames: Set<string>): string {
    let baseName = toPascalCase(commandName)
    baseName = baseName.replace(/:/g, '')
    let uniqueName = baseName
    let counter = 1

    while (usedNames.has(uniqueName)) {
      uniqueName = `${baseName}${counter}`
      counter++
    }

    usedNames.add(uniqueName)
    return uniqueName
  }

  private findOriginalPropName(tool: MCPTool, flagName: string): string {
    if (!tool.inputSchema?.properties) {
      return flagName
    }

    if (tool.inputSchema.properties[flagName]) {
      return flagName
    }

    const camelCase = toCamelCase(flagName)
    if (tool.inputSchema.properties[camelCase]) {
      return camelCase
    }

    const snakeCase = flagName.replace(/-/g, '_')
    if (tool.inputSchema.properties[snakeCase]) {
      return snakeCase
    }

    return flagName
  }
}

// Convenience alias
export const Commands = CommandBuilder
