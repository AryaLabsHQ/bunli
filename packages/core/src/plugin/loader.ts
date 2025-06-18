/**
 * Plugin loader implementation
 */

import { join } from 'path'
import type { BunliPlugin, PluginConfig } from './types.js'

export class PluginLoader {
  /**
   * Load a plugin from various configuration formats
   */
  async loadPlugin(config: PluginConfig): Promise<BunliPlugin> {
    // String path - dynamic import
    if (typeof config === 'string') {
      return this.loadFromPath(config)
    }
    
    // Plugin object - use directly
    if (this.isPluginObject(config)) {
      return config
    }
    
    // Function - call it
    if (typeof config === 'function') {
      return config()
    }
    
    // Array - function with options
    if (Array.isArray(config) && config.length === 2) {
      const [factory, options] = config
      if (typeof factory === 'function') {
        return factory(options)
      }
    }
    
    throw new Error(`Invalid plugin configuration: ${JSON.stringify(config)}`)
  }
  
  /**
   * Load plugin from file path
   */
  private async loadFromPath(path: string): Promise<BunliPlugin> {
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
        return plugin()
      }
      
      // Validate it's a plugin object
      if (!this.isPluginObject(plugin)) {
        throw new Error(`Module does not export a valid plugin`)
      }
      
      return plugin
    } catch (error: any) {
      throw new Error(`Failed to load plugin from ${path}: ${error.message}`)
    }
  }
  
  /**
   * Check if an object is a valid plugin
   */
  private isPluginObject(obj: any): obj is BunliPlugin {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.name === 'string' &&
           obj.name.length > 0
  }
  
  /**
   * Validate loaded plugin
   */
  validatePlugin(plugin: BunliPlugin): void {
    if (!plugin.name) {
      throw new Error('Plugin must have a name')
    }
    
    // Check hook types
    const hooks = ['setup', 'configResolved', 'beforeCommand', 'afterCommand']
    for (const hook of hooks) {
      const value = plugin[hook as keyof BunliPlugin]
      if (value !== undefined && typeof value !== 'function') {
        throw new Error(`Plugin ${plugin.name}: ${hook} must be a function`)
      }
    }
  }
}