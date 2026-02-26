/**
 * Plugin loader implementation
 */

import { join } from 'path'
import type { BunliPlugin, PluginConfig } from './types.js'
import { Result } from 'better-result'
import { PluginLoadError, PluginValidationError, toErrorMessage } from './errors.js'

export class PluginLoader {
  /**
   * Load a plugin from various configuration formats
   */
  async loadPlugin(config: PluginConfig): Promise<BunliPlugin> {
    const result = await this.loadPluginResult(config)
    if (result.isOk()) {
      return result.value
    }

    throw result.error
  }

  async loadPluginResult(config: PluginConfig): Promise<Result<BunliPlugin, PluginLoadError>> {
    // String path - dynamic import
    if (typeof config === 'string') {
      return this.loadFromPath(config)
    }
    
    // Plugin object - use directly
    if (this.isPluginObject(config)) {
      return Result.ok(config)
    }
    
    // Function - call it
    if (typeof config === 'function') {
      return Result.try({
        try: () => config(),
        catch: (cause) => new PluginLoadError({
          message: `Failed to create plugin from factory: ${toErrorMessage(cause)}`,
          plugin: this.getConfigName(config),
          cause
        })
      })
    }
    
    // Array - function with options
    if (Array.isArray(config) && config.length === 2) {
      const [factory, options] = config
      if (typeof factory === 'function') {
        return Result.try({
          try: () => factory(options),
          catch: (cause) => new PluginLoadError({
            message: `Failed to create plugin from factory: ${toErrorMessage(cause)}`,
            plugin: this.getConfigName(config),
            cause
          })
        })
      }
    }
    
    return Result.err(new PluginLoadError({
      message: `Invalid plugin configuration: ${JSON.stringify(config)}`,
      plugin: this.getConfigName(config),
      cause: config
    }))
  }
  
  /**
   * Load plugin from file path
   */
  private async loadFromPath(path: string): Promise<Result<BunliPlugin, PluginLoadError>> {
    try {
      // Handle both absolute and relative paths
      const resolvedPath = path.startsWith('.') 
        ? join(process.cwd(), path)
        : path
      
      // Dynamic import
      const module = await import(resolvedPath)
      
      // Handle various export styles
      const plugin = module.default || module.plugin || module
      
      // If it's a factory function, call it without options
      if (typeof plugin === 'function' && !this.isPluginObject(plugin)) {
        return Result.try({
          try: () => plugin(),
          catch: (cause) => new PluginLoadError({
            message: `Failed to initialize plugin factory from ${path}: ${toErrorMessage(cause)}`,
            plugin: path,
            cause
          })
        })
      }
      
      // Validate it's a plugin object
      if (!this.isPluginObject(plugin)) {
        return Result.err(new PluginLoadError({
          message: 'Module does not export a valid plugin',
          plugin: path,
          cause: plugin
        }))
      }
      
      return Result.ok(plugin)
    } catch (error) {
      return Result.err(new PluginLoadError({
        message: `Failed to load plugin from ${path}: ${toErrorMessage(error)}`,
        plugin: path,
        cause: error
      }))
    }
  }
  
  /**
   * Check if an object is a valid plugin
   */
  private isPluginObject(obj: unknown): obj is BunliPlugin {
    return !!obj &&
      typeof obj === 'object' &&
      typeof (obj as { name?: unknown }).name === 'string' &&
      (obj as { name: string }).name.length > 0
  }
  
  /**
   * Validate loaded plugin
   */
  validatePlugin(plugin: BunliPlugin): void {
    const result = this.validatePluginResult(plugin)
    if (result.isErr()) {
      throw result.error
    }
  }

  validatePluginResult(plugin: BunliPlugin): Result<void, PluginValidationError> {
    if (!plugin.name) {
      return Result.err(new PluginValidationError({
        message: 'Plugin must have a name',
        plugin: '<unknown>'
      }))
    }
    
    // Check hook types
    const hooks = ['setup', 'configResolved', 'beforeCommand', 'afterCommand']
    for (const hook of hooks) {
      const value = plugin[hook as keyof BunliPlugin]
      if (value !== undefined && typeof value !== 'function') {
        return Result.err(new PluginValidationError({
          message: `Plugin ${plugin.name}: ${hook} must be a function`,
          plugin: plugin.name
        }))
      }
    }

    return Result.ok(undefined)
  }

  private getConfigName(config: PluginConfig): string {
    if (typeof config === 'string') return config
    if (Array.isArray(config)) {
      return typeof config[0] === 'function'
        ? config[0].name || '<plugin-factory>'
        : '<plugin-array>'
    }
    if (typeof config === 'function') return config.name || '<plugin-factory>'
    if (this.isPluginObject(config)) return config.name
    return '<unknown-plugin>'
  }
}
