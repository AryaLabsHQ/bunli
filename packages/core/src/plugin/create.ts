/**
 * Plugin development utilities
 */

import type { BunliPlugin, PluginFactory } from './types.js'

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
// Overload for direct plugin
export function createPlugin<TStore = {}>(
  plugin: BunliPlugin<TStore>
): BunliPlugin<TStore>

export function createPlugin<TOptions, TStore = {}>(
  factory: (options: TOptions) => BunliPlugin<TStore>
): (options: TOptions) => BunliPlugin<TStore>

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