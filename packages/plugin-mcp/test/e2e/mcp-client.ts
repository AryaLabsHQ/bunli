/**
 * MCP client helpers for end-to-end testing
 *
 * Connects to real MCP servers and fetches tool schemas.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { MCPTool } from '../../src/types.js'

export interface StdioServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

export interface HttpServerConfig {
  url: string
  /**
   * Transport type for HTTP servers
   * @default 'streamable'
   */
  transport?: 'streamable' | 'sse'
}

/**
 * Connect to a stdio MCP server and fetch tools
 */
export async function fetchToolsFromStdio(
  config: StdioServerConfig
): Promise<MCPTool[]> {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: {
      ...process.env,
      ...config.env
    },
    cwd: config.cwd
  })

  const client = new Client(
    { name: 'bunli-mcp-test', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)

  try {
    const result = await client.listTools()
    return result.tools as MCPTool[]
  } finally {
    await client.close()
  }
}

/**
 * Connect to an HTTP MCP server and fetch tools
 */
export async function fetchToolsFromHttp(
  config: HttpServerConfig
): Promise<MCPTool[]> {
  const url = new URL(config.url)
  const transportType = config.transport ?? 'streamable'

  const transport = transportType === 'sse'
    ? new SSEClientTransport(url)
    : new StreamableHTTPClientTransport(url)

  const client = new Client(
    { name: 'bunli-mcp-test', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)

  try {
    const result = await client.listTools()
    return result.tools as MCPTool[]
  } finally {
    await client.close()
  }
}

/**
 * Normalize tools for deterministic JSON output
 */
export function normalizeTools(tools: MCPTool[]): MCPTool[] {
  return [...tools]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(tool => {
      const normalized: MCPTool = {
        name: tool.name,
        description: tool.description
      }

      if (tool.inputSchema) {
        const schema = { ...tool.inputSchema }

        // Sort properties for deterministic output
        if (schema.properties) {
          const sortedProps: Record<string, unknown> = {}
          for (const key of Object.keys(schema.properties).sort()) {
            sortedProps[key] = schema.properties[key]
          }
          schema.properties = sortedProps
        }

        // Sort required array
        if (schema.required) {
          schema.required = [...schema.required].sort()
        }

        normalized.inputSchema = schema
      }

      return normalized
    })
}

/**
 * Format tools as readable JSON
 */
export function toolsToJson(tools: MCPTool[]): string {
  return JSON.stringify(normalizeTools(tools), null, 2)
}
