/**
 * Plugin development utilities
 */

import type { BunliPlugin, PluginFactory, MergeStores } from './types.js'

/**
 * Create a plugin - supports both direct plugins and plugin factories
 * 
 * @example Direct plugin with explicit store type:
 * ```typescript
 * interface MyStore {
 *   count: number
 *   message: string
 * }
 * 
 * const myPlugin = createPlugin<MyStore>({
 *   name: 'my-plugin',
 *   store: {
 *     count: 0,
 *     message: ''
 *   },
 *   beforeCommand(context) {
 *     context.store.count++ // TypeScript knows the type!
 *   }
 * })
 * ```
 * 
 * @example Plugin factory with options:
 * ```typescript
 * const myPlugin = createPlugin((options: { prefix: string }) => ({
 *   name: 'my-plugin',
 *   store: {
 *     count: 0
 *   },
 *   beforeCommand(context) {
 *     console.log(`${options.prefix}: ${context.store.count}`)
 *   }
 * } satisfies BunliPlugin<{ count: number }>))
 * 
 * // Use it:
 * myPlugin({ prefix: 'Hello' })
 * ```
 */
export function createPlugin<TOptions, TStore = {}>(
  factory: (options: TOptions) => BunliPlugin<TStore>
): (options: TOptions) => BunliPlugin<TStore>

// Overload for direct plugin
export function createPlugin<TStore = {}>(
  plugin: BunliPlugin<TStore>
): BunliPlugin<TStore>

export function createPlugin<T>(
  input: T
): T {
  return input
}

/**
 * Infer plugin options type from a plugin factory
 * 
 * @example
 * ```typescript
 * type Options = InferPluginOptions<typeof myPlugin>
 * ```
 */
export type InferPluginOptions<T> = T extends PluginFactory<infer O, any> ? O : never

/**
 * Infer plugin store type
 * 
 * @example
 * ```typescript
 * type Store = InferPluginStore<typeof myPlugin>
 * ```
 */
export type InferPluginStore<T> = T extends BunliPlugin<infer S> ? S : T extends PluginFactory<any, infer S> ? S : {}

/**
 * Create a test plugin for development and testing
 * 
 * @example
 * ```typescript
 * const testPlugin = createTestPlugin(
 *   { count: 0, message: '' },
 *   {
 *     beforeCommand(context) {
 *       context.store.count++
 *       console.log(`Count: ${context.store.count}`)
 *     }
 *   }
 * )
 * ```
 */
export function createTestPlugin<TStore = {}>(
  store: TStore,
  hooks: Partial<BunliPlugin<TStore>>
): BunliPlugin<TStore> {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    store,
    ...hooks
  }
}

/**
 * Compose multiple plugins into a single plugin
 * 
 * @example
 * ```typescript
 * const composedPlugin = composePlugins(
 *   authPlugin({ provider: 'github' }),
 *   loggingPlugin({ level: 'debug' }),
 *   metricsPlugin({ enabled: true })
 * )
 * ```
 */
export function composePlugins<T extends BunliPlugin[]>(
  ...plugins: T
): BunliPlugin<MergeStores<T>> {
  const composedStore = plugins.reduce((acc, plugin) => {
    if (plugin.store) {
      return { ...acc, ...plugin.store }
    }
    return acc
  }, {} as MergeStores<T>)

  return {
    name: 'composed-plugin',
    version: '1.0.0',
    store: composedStore,
    async setup(context) {
      for (const plugin of plugins) {
        if (plugin.setup) {
          await plugin.setup(context)
        }
      }
    },
    async configResolved(config) {
      for (const plugin of plugins) {
        if (plugin.configResolved) {
          await plugin.configResolved(config)
        }
      }
    },
    async beforeCommand(context) {
      for (const plugin of plugins) {
        if (plugin.beforeCommand) {
          await plugin.beforeCommand(context)
        }
      }
    },
    async afterCommand(context) {
      for (const plugin of plugins) {
        if (plugin.afterCommand) {
          await plugin.afterCommand(context)
        }
      }
    }
  }
}
