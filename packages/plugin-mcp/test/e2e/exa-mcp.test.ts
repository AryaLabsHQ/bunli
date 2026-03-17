/**
 * End-to-end tests using Exa MCP server
 *
 * These tests connect to real MCP servers and test:
 * 1. Tool fetching from stdio/http transports
 * 2. Command generation with the builder
 * 3. Runtime command creation
 *
 * Run:
 *   bun test test/e2e/                      # Run E2E tests
 *
 * Requires EXA_API_KEY in .env (auto-loaded by Bun)
 */

import { describe, expect, test, beforeAll } from 'bun:test'
import { Result } from 'better-result'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fetchToolsFromStdio, fetchToolsFromHttp, toolsToJson } from './mcp-client.js'
import { Commands } from '../../src/builder.js'
import { createCommandsFromMCPTools } from '../../src/converter.js'
import type { MCPTool } from '../../src/types.js'

// Import template as text
import cliTemplate from './cli.template' with { type: 'text' }

const EXA_API_KEY = process.env.EXA_API_KEY
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === '1' || process.env.UPDATE_SNAPSHOTS === 'true'

// Snapshot directory
const SNAPSHOTS_DIR = join(dirname(import.meta.path), 'snapshots')

// Skip tests if no API key
const describeWithKey = EXA_API_KEY ? describe : describe.skip

/**
 * Read a snapshot file, return null if it doesn't exist
 */
async function readSnapshot(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Write a snapshot file, creating directories as needed
 */
async function writeSnapshot(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
}

/**
 * Compare or update a snapshot
 */
async function assertSnapshot(name: string, subdir: string, content: string): Promise<void> {
  const snapshotPath = join(SNAPSHOTS_DIR, subdir, name)

  if (UPDATE_SNAPSHOTS) {
    await writeSnapshot(snapshotPath, content)
    console.log(`  ✓ Updated snapshot: ${subdir}/${name}`)
    return
  }

  const existing = await readSnapshot(snapshotPath)

  if (existing === null) {
    // No snapshot exists - create it
    await writeSnapshot(snapshotPath, content)
    console.log(`  ✓ Created snapshot: ${subdir}/${name}`)
    return
  }

  // Compare
  expect(content).toBe(existing)
}

/**
 * Generate a full CLI file from tools using the template
 */
function generateCli(tools: MCPTool[], serverName: string, timeout: number = 60000): string {
  const builder = Commands.from(tools).namespace(serverName).timeout(timeout)

  const commands = builder.commands()
  const registrations = builder.registrations()

  return cliTemplate
    .replace(/\{\{SERVER_NAME\}\}/g, serverName)
    .replace(/\{\{DEFAULT_TIMEOUT\}\}/g, String(timeout))
    .replace(/\{\{COMMANDS\}\}/g, commands)
    .replace(/\{\{REGISTRATIONS\}\}/g, registrations)
}

// ============================================================================
// Stdio Tests
// ============================================================================

describeWithKey('Exa MCP - Stdio', () => {
  let tools: MCPTool[]

  beforeAll(async () => {
    console.log('Connecting to Exa MCP server via stdio...')
    tools = await fetchToolsFromStdio({
      command: 'npx',
      args: ['-y', 'exa-mcp-server'],
      env: { EXA_API_KEY: EXA_API_KEY! }
    })
    console.log(`  Fetched ${tools.length} tools`)
  })

  test('fetches tools successfully', () => {
    expect(tools.length).toBeGreaterThan(0)
  })

  test('tools have valid structure', () => {
    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe('string')
    }
  })

  test('converts to Bunli commands (runtime)', () => {
    const commandsResult = createCommandsFromMCPTools(tools, {
      namespace: 'exa',
      createHandler: () => async () => {}
    })
    expect(Result.isOk(commandsResult)).toBe(true)
    if (Result.isError(commandsResult)) {
      throw commandsResult.error
    }
    const commands = commandsResult.value

    expect(commands.length).toBe(tools.length)

    for (const cmd of commands) {
      expect(cmd.name).toMatch(/^exa:/)
      expect(cmd.handler).toBeDefined()
    }
  })

  test('generates commands with builder', () => {
    const builder = Commands.from(tools).namespace('exa')

    expect(builder.count()).toBe(tools.length)

    const commands = builder.commands()
    expect(commands).toContain('defineCommand')
    expect(commands).toContain("name: 'exa:")

    const registrations = builder.registrations()
    expect(registrations).toContain('cli.command(')

    const names = builder.commandNames()
    expect(names.length).toBe(tools.length)
    expect(names[0]).toMatch(/Command$/)
  })

  test('snapshot: tools.json', async () => {
    const json = toolsToJson(tools)
    await assertSnapshot('tools.json', 'exa-stdio', json)
  })

  test('snapshot: cli.ts', async () => {
    const cli = generateCli(tools, 'exa', 60000)
    await assertSnapshot('cli.ts', 'exa-stdio', cli)
  })
})

// ============================================================================
// HTTP Tests
// ============================================================================

describeWithKey('Exa MCP - HTTP', () => {
  let tools: MCPTool[]

  beforeAll(async () => {
    console.log('Connecting to Exa MCP server via HTTP...')
    tools = await fetchToolsFromHttp({
      url: `https://mcp.exa.ai/mcp?x-api-key=${EXA_API_KEY}`
    })
    console.log(`  Fetched ${tools.length} tools`)
  })

  test('fetches tools successfully', () => {
    expect(tools.length).toBeGreaterThan(0)
  })

  test('tools have valid structure', () => {
    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe('string')
    }
  })

  test('converts to Bunli commands (runtime)', () => {
    const commandsResult = createCommandsFromMCPTools(tools, {
      namespace: 'exa',
      createHandler: () => async () => {}
    })
    expect(Result.isOk(commandsResult)).toBe(true)
    if (Result.isError(commandsResult)) {
      throw commandsResult.error
    }
    const commands = commandsResult.value

    expect(commands.length).toBe(tools.length)

    for (const cmd of commands) {
      expect(cmd.name).toMatch(/^exa:/)
      expect(cmd.handler).toBeDefined()
    }
  })

  test('generates commands with builder', () => {
    const builder = Commands.from(tools).namespace('exa')

    expect(builder.count()).toBe(tools.length)

    const commands = builder.commands()
    expect(commands).toContain('defineCommand')
    expect(commands).toContain("name: 'exa:")
  })

  test('snapshot: tools.json', async () => {
    const json = toolsToJson(tools)
    await assertSnapshot('tools.json', 'exa-http', json)
  })

  test('snapshot: cli.ts', async () => {
    const cli = generateCli(tools, 'exa', 60000)
    await assertSnapshot('cli.ts', 'exa-http', cli)
  })
})

// ============================================================================
// Consistency Tests
// ============================================================================

describeWithKey('Exa MCP - Consistency', () => {
  test('stdio and HTTP return same tools', async () => {
    const [stdioTools, httpTools] = await Promise.all([
      fetchToolsFromStdio({
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: { EXA_API_KEY: EXA_API_KEY! }
      }),
      fetchToolsFromHttp({
        url: `https://mcp.exa.ai/mcp?x-api-key=${EXA_API_KEY}`
      })
    ])

    const stdioNames = stdioTools.map(t => t.name).sort()
    const httpNames = httpTools.map(t => t.name).sort()

    expect(stdioNames).toEqual(httpNames)
  })

  test('builder produces consistent structure for same tools', async () => {
    const [stdioTools, httpTools] = await Promise.all([
      fetchToolsFromStdio({
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: { EXA_API_KEY: EXA_API_KEY! }
      }),
      fetchToolsFromHttp({
        url: `https://mcp.exa.ai/mcp?x-api-key=${EXA_API_KEY}`
      })
    ])

    // Tool names should be the same (descriptions may differ between transports)
    const stdioBuilder = Commands.from(stdioTools).namespace('exa')
    const httpBuilder = Commands.from(httpTools).namespace('exa')

    expect(stdioBuilder.commandNames()).toEqual(httpBuilder.commandNames())
    expect(stdioBuilder.count()).toBe(httpBuilder.count())
  })
})
