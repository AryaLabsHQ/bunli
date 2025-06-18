/**
 * Plugin development utilities
 */

import type { BunliPlugin, PluginFactory } from './types.js'

/**
 * Create a plugin - supports both direct plugins and plugin factories
 * 
 * @example Direct plugin (no options):
 * ```typescript
 * const myPlugin = createPlugin({
 *   name: 'my-plugin',
 *   store: {
 *     count: 0,
 *     message: '' as string
 *   },
 *   beforeCommand({ store }) {
 *     store.count++ // TypeScript knows the type!
 *   }
 * })
 * ```
 * 
 * @example Plugin with options (using a function):
 * ```typescript
 * const myPlugin = createPlugin((options: { prefix: string }) => ({
 *   name: 'my-plugin',
 *   store: {
 *     count: 0
 *   },
 *   beforeCommand({ store }) {
 *     console.log(`${options.prefix}: ${store.count}`)
 *   }
 * }))
 * 
 * // Use it:
 * myPlugin({ prefix: 'Hello' })
 * ```
 */
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