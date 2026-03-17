import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { PluginContext } from '@bunli/core/plugin'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { configMergerPlugin } from '../src/index.js'

interface LoggerCapture {
  debug: string[]
  info: string[]
  warn: string[]
}

function createTestContext(capture: LoggerCapture) {
  const updates: Array<Record<string, unknown>> = []
  const context: PluginContext = {
    config: { name: 'bunli' },
    updateConfig(partial: Record<string, unknown>) {
      updates.push(partial)
    },
    registerCommand() {},
    use() {},
    store: new Map(),
    logger: {
      debug: (message: string) => capture.debug.push(message),
      info: (message: string) => capture.info.push(message),
      warn: (message: string) => capture.warn.push(message)
    },
    paths: {
      cwd: process.cwd(),
      home: tmpdir(),
      config: tmpdir()
    }
  }
  return {
    updates,
    context
  }
}

describe('@bunli/plugin-config', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bunli-plugin-config-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('loads and merges config sources', async () => {
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({ retries: 3, env: 'test' }), 'utf-8')

    const logger: LoggerCapture = { debug: [], info: [], warn: [] }
    const { context, updates } = createTestContext(logger)
    const plugin = configMergerPlugin({ sources: [configPath] })

    await plugin.setup?.(context)

    expect(updates).toHaveLength(1)
    expect(updates[0]).toEqual({ retries: 3, env: 'test' })
    expect(logger.info.join('\n')).toContain('Merged 1 config file(s)')
  })

  test('warns and skips malformed config JSON', async () => {
    const configPath = join(dir, 'bad-config.json')
    await writeFile(configPath, '{ "foo": ', 'utf-8')

    const logger: LoggerCapture = { debug: [], info: [], warn: [] }
    const { context, updates } = createTestContext(logger)
    const plugin = configMergerPlugin({ sources: [configPath] })

    await plugin.setup?.(context)

    expect(updates).toHaveLength(0)
    expect(logger.warn.join('\n')).toContain('Failed to parse config file')
  })
})
