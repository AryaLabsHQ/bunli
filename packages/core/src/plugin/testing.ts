/**
 * Plugin testing utilities for Bunli
 */

import type { BunliPlugin, CommandContext, PluginContext } from './types.js'
import { ExecutionState } from './types.js'
import type { BunliConfigInput, ResolvedConfig } from '../types.js'
import { createLogger } from '../utils/logger.js'

/**
 * Mock plugin context for testing
 */
export function createMockPluginContext(
  config: Partial<BunliConfigInput> = {},
  store: Map<string, unknown> = new Map()
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
      config: '/tmp/.config/bunli',
      data: '/tmp/.local/share/bunli',
      state: '/tmp/.local/state/bunli',
      cache: '/tmp/.cache/bunli',
    }
  }
}

/**
 * Mock command context for testing
 */
export function createMockCommandContext<TStore = {}>(
  command: string = 'test',
  args: string[] = [],
  flags: Record<string, unknown> = {},
  store: TStore = {} as TStore
): CommandContext<TStore> {
  return {
    command,
    commandDef: {
      name: command,
      description: `${command} command`,
      handler: async () => {}
    },
    args,
    flags,
    env: {
      isCI: false
    },
    store,
    getStoreValue: (key: keyof TStore) => (store as Record<string | number | symbol, unknown>)[key as string | number | symbol] as TStore[keyof TStore],
    setStoreValue: (key: keyof TStore, value: TStore[keyof TStore]) => {
      ;(store as Record<string | number | symbol, unknown>)[key as string | number | symbol] = value
    },
    hasStoreValue: (key: keyof TStore) => key in (store as object)
  }
}

function createMockResultContext<TStore = {}>(
  context: CommandContext<TStore>,
  exitCode: number
): CommandContext<TStore> & { exitCode: number } {
  return Object.assign(
    Object.create(Object.getPrototypeOf(context)),
    context,
    { exitCode }
  ) as CommandContext<TStore> & { exitCode: number }
}

/**
 * Test plugin lifecycle hooks
 */
export async function testPluginHooks<TStore = {}>(
  plugin: BunliPlugin<TStore>,
  options: {
    config?: Partial<BunliConfigInput>
    store?: TStore
    command?: string
    args?: string[]
    flags?: Record<string, unknown>
  } = {}
) {
  const results: {
    setup?: any
    configResolved?: any
    beforeCommand?: any
    preRun?: any
    postRun?: any
    afterCommand?: any
  } = {}
  const executionState = new ExecutionState()
  const sharedHookContext = (plugin.preRun || plugin.postRun)
    ? createMockCommandContext(
        options.command || 'test',
        options.args || [],
        options.flags || {},
        options.store || ({} as TStore)
      )
    : undefined

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
        commands: {
          entry: undefined,
          directory: undefined,
          generateReport: undefined
        },
        build: {
          targets: [],
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
        renderer: {},
        image: {}
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
      options.store || ({} as TStore)
    )
    try {
      await plugin.beforeCommand(context)
      results.beforeCommand = { success: true, context }
    } catch (error) {
      results.beforeCommand = { success: false, error }
    }
  }

  // Test preRun hook
  if (plugin.preRun) {
    const context = sharedHookContext!
    try {
      await plugin.preRun(context, executionState)
      results.preRun = { success: true, context, state: executionState }
    } catch (error) {
      results.preRun = { success: false, error }
    }
  }

  // Test postRun hook
  if (plugin.postRun) {
    const context = sharedHookContext!
    try {
      await plugin.postRun(createMockResultContext(context, 0), executionState)
      results.postRun = { success: true, context, state: executionState }
    } catch (error) {
      results.postRun = { success: false, error }
    }
  }

  // Test afterCommand hook
  if (plugin.afterCommand) {
    const context = createMockCommandContext(
      options.command || 'test',
      options.args || [],
      options.flags || {},
      options.store || ({} as TStore)
    )
    try {
      await plugin.afterCommand(createMockResultContext(context, 0))
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
    preRunShouldSucceed?: boolean
    postRunShouldSucceed?: boolean
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

  if (expectations.preRunShouldSucceed !== undefined) {
    const actual = results.preRun?.success ?? false
    if (actual !== expectations.preRunShouldSucceed) {
      assertions.push(`PreRun hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.preRunShouldSucceed ? 'success' : 'failure'}`)
    }
  }

  if (expectations.postRunShouldSucceed !== undefined) {
    const actual = results.postRun?.success ?? false
    if (actual !== expectations.postRunShouldSucceed) {
      assertions.push(`PostRun hook ${actual ? 'succeeded' : 'failed'} but expected ${expectations.postRunShouldSucceed ? 'success' : 'failure'}`)
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
