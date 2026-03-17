/**
 * TypeScript interfaces for @bunli/plugin-mcp
 *
 * These types mirror the MCP tool schema format without depending on @modelcontextprotocol/sdk
 */

import type { Command, Handler, CLIOption, Options } from '@bunli/core'
import type { IPluginContext } from '@bunli/core/plugin'
import type { z } from 'zod'

/**
 * JSON Schema 7 types (subset used by MCP)
 */
export interface JSONSchema7 {
  type?: JSONSchema7Type | JSONSchema7Type[]
  description?: string
  enum?: Array<string | number | boolean | null>
  const?: unknown
  default?: unknown

  // String constraints
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string

  // Number constraints
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number

  // Array constraints
  items?: JSONSchema7 | JSONSchema7[]
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean

  // Object constraints
  properties?: Record<string, JSONSchema7>
  required?: string[]
  additionalProperties?: boolean | JSONSchema7

  // Composition
  anyOf?: JSONSchema7[]
  oneOf?: JSONSchema7[]
  allOf?: JSONSchema7[]
  not?: JSONSchema7

  // References
  $ref?: string
  definitions?: Record<string, JSONSchema7>
}

export type JSONSchema7Type = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'

/**
 * MCP Tool interface (matches @modelcontextprotocol/sdk Tool type)
 *
 * The plugin does NOT depend on the SDK - just uses this interface shape.
 * Callers (mcp-exec, mcporter) fetch tools from servers and pass them here.
 */
export interface MCPTool {
  /** Tool name (typically snake_case from MCP servers) */
  name: string

  /** Human-readable description of what the tool does */
  description?: string

  /** JSON Schema for the tool's input parameters */
  inputSchema?: MCPToolInputSchema
}

/**
 * MCP Tool input schema (JSON Schema object type)
 */
export interface MCPToolInputSchema {
  type: 'object'
  properties?: Record<string, JSONSchema7>
  required?: string[]
  additionalProperties?: boolean
}

/**
 * Options for createCommandsFromMCPTools
 */
export interface ConvertOptions<TStore = Record<string, unknown>> {
  /**
   * Namespace prefix for command names
   * @example 'linear' → 'linear:create-issue'
   */
  namespace?: string

  /**
   * Factory function to create handlers for each tool
   * You control how tools are invoked - use your own MCP client
   */
  createHandler: (toolName: string) => Handler<Record<string, unknown>, TStore>

  /**
   * Custom command name transformer
   * @default snake_case → kebab-case
   */
  commandName?: (toolName: string) => string

  /**
   * Transform property name from inputSchema to CLI flag name
   * @default camelCase/snake_case → kebab-case
   */
  flagName?: (propName: string) => string
}

/**
 * Group of MCP tools with a namespace
 */
export interface MCPToolGroup {
  /** Namespace for this group of tools (e.g., server name) */
  namespace: string

  /** Array of MCP tools */
  tools: MCPTool[]
}

/**
 * Options for mcpPlugin factory
 */
export interface McpPluginOptions<TStore = Record<string, unknown>> {
  /**
   * Async function to get tools from your MCP client(s)
   * Called during plugin setup
   */
  toolsProvider: (context: IPluginContext) => Promise<MCPToolGroup[]>

  /**
   * Factory function to create handlers for each tool
   */
  createHandler: (namespace: string, toolName: string) => Handler<Record<string, unknown>, TStore>

  /**
   * Enable type generation
   * - true: Generate to '.bunli' directory
   * - { outputDir: string }: Generate to specified directory
   */
  sync?: boolean | { outputDir?: string }
}

/**
 * Plugin store for mcpPlugin
 */
export interface McpPluginStore {
  /** Registered MCP commands */
  commands: Array<{
    namespace: string
    toolName: string
    commandName: string
  }>
}

/**
 * Options for type generation
 */
export interface GenerateTypesOptions {
  /** Groups of tools to generate types for */
  tools: MCPToolGroup[]

  /** Output directory for generated files */
  outputDir: string
}

/**
 * Generated command metadata (for codegen)
 */
export interface GeneratedMCPCommandMeta {
  name: string
  toolName: string
  namespace: string
  description?: string
  options: Record<string, {
    type: string
    required: boolean
    description?: string
    enumValues?: Array<string | number>
    minimum?: number
    maximum?: number
  }>
}

/**
 * Result of createCommandsFromMCPTools
 */
export type MCPCommand<TStore = Record<string, unknown>> = Command<Options, TStore>
