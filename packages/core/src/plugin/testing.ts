/**
 * Plugin testing utilities for Bunli
 */

import type { BunliPlugin, CommandContext, PluginContext } from './types.js'
import type { BunliConfig, ResolvedConfig } from '../types.js'
import { createLogger } from '../utils/logger.js'

/**
 * Mock plugin context for testing
 */
export function createMockPluginContext(
  config: Partial<BunliConfig> = {},
  store: Map<string, any> = new Map()
): PluginContext {
  return {
    config,
    updateConfig: () => {},
    registerCommand: () => {},
    use: () => {},
    store,
    logger: createLogger('test'),
    paths: {
      cwd: process.cwd(),
      home: process.env.HOME || '/tmp',
      config: '/tmp/.config/bunli'
    }
  }
}

/**
 * Mock command context for testing
 */
export function createMockCommandContext<TStore = {}>(
  command: string = 'test',
  args: string[] = [],
  flags: Record<string, any> = {},
  store: TStore = {} as TStore
): CommandContext<TStore> {
  return {
    command,
    commandDef: {} as any,
    args,
    flags,
    env: {
      isCI: false
    },
    store,
    getStoreValue: (key: keyof TStore) => (store as any)[key],
    setStoreValue: (key: keyof TStore, value: any) => {
      (store as any)[key] = value
    },
    hasStoreValue: (key: keyof TStore) => key in (store as object)
  }
}

/**
 * Test plugin lifecycle hooks
 */
export async function testPluginHooks<TStore = {}>(
  plugin: BunliPlugin<TStore>,
  options: {
    config?: Partial<BunliConfig>
    store?: TStore
    command?: string
    args?: string[]
    flags?: Record<string, any>
  } = {}
) {
  const results: {
    setup?: any
    configResolved?: any
    beforeCommand?: any
    afterCommand?: any
  } = {}

  // Test setup hook
  if (plugin.setup) {
    const context = createMockPluginContext(options.config)
    try {
      await plugin.setup(context)
      results.setup = { success: true, context }
    } catch (error) {
      results.setup = { success: false, error }
    }
  }

  // Test configResolved hook
  if (plugin.configResolved) {
    const config: ResolvedConfig = {
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI',
      commands: {},
      build: {
        targets: ['native'],
        compress: false,
        minify: false,
        sourcemap: true
      },
      dev: {
        watch: true,
        inspect: false
      },
      test: {
        pattern: ['**/*.test.ts', '**/*.spec.ts'],
        coverage: false,
        watch: false
      },
      workspace: {
        versionStrategy: 'fixed'
      },
      release: {
        npm: true,
        github: false,
        tagFormat: 'v{{version}}',
        conventionalCommits: true
      },
      plugins: [],
      tui: {
        renderer: {}
      }
    }
    try {
      await plugin.configResolved(config)
      results.configResolved = { success: true, config }
    } catch (error) {
      results.configResolved = { success: false, error }
    }
  }

  // Test beforeCommand hook
  if (plugin.beforeCommand) {
    const context = createMockCommandContext(
      options.command || 'test',
      options.args || [],
      options.flags || {},
      options.store || {} as TStore
    )
    try {
      await plugin.beforeCommand(context)
      results.beforeCommand = { success: true, context }
    } catch (error) {
      results.beforeCommand = { success: false, error }
    }
  }

  // Test afterCommand hook
  if (plugin.afterCommand) {
    const context = createMockCommandContext(
      options.command || 'test',
      options.args || [],
      options.flags || {},
      options.store || {} as TStore
    )
    try {
      await plugin.afterCommand(context as any)
      results.afterCommand = { success: true, context }
    } catch (error) {
      results.afterCommand = { success: false, error }
    }
  }

  return results
}

/**
 * Assert plugin behavior in tests
 */
export function assertPluginBehavior(
  results: Awaited<ReturnType<typeof testPluginHooks>>,
  expectations: {
    setupShouldSucceed?: boolean
    configResolvedShouldSucceed?: boolean
    beforeCommandShouldSucceed?: boolean
    afterCommandShouldSucceed?: boolean
  }
) {
  const assertions: string[] = []

  if (expectations.setupShouldSucceed !== undefined) {
    const actual = results.setup?.success ?? false
    if (actual !== expectations.setupShouldSucceed) {
      assertions.push(`Setup hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.setupShouldSucceed ? 'success' : 'failure'}`)
    }
  }

  if (expectations.configResolvedShouldSucceed !== undefined) {
    const actual = results.configResolved?.success ?? false
    if (actual !== expectations.configResolvedShouldSucceed) {
      assertions.push(`ConfigResolved hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.configResolvedShouldSucceed ? 'success' : 'failure'}`)
    }
  }

  if (expectations.beforeCommandShouldSucceed !== undefined) {
    const actual = results.beforeCommand?.success ?? false
    if (actual !== expectations.beforeCommandShouldSucceed) {
      assertions.push(`BeforeCommand hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.beforeCommandShouldSucceed ? 'success' : 'failure'}`)
    }
  }

  if (expectations.afterCommandShouldSucceed !== undefined) {
    const actual = results.afterCommand?.success ?? false
    if (actual !== expectations.afterCommandShouldSucceed) {
      assertions.push(`AfterCommand hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.afterCommandShouldSucceed ? 'success' : 'failure'}`)
    }
  }

  if (assertions.length > 0) {
    throw new Error(`Plugin behavior assertions failed:\n${assertions.join('\n')}`)
  }
}
