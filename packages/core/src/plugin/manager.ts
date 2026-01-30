/**
 * Plugin lifecycle manager
 */

import { homedir } from 'os'
import { join } from 'path'
import { PluginLoader } from './loader.js'
import { PluginContext, CommandContext, createEnvironmentInfo } from './context.js'
import { deepMerge } from '../utils/merge.js'
import { createLogger } from '../utils/logger.js'
import type { 
  BunliPlugin, 
  PluginConfig, 
  CommandResult,
  CommandDefinition,
  Middleware
} from './types.js'
import type { BunliConfig, ResolvedConfig } from '../types.js'

export interface PluginSetupResult {
  config: Partial<BunliConfig>
  commands: CommandDefinition[]
  middlewares: Middleware[]
}

export class PluginManager<TStore = {}> {
  private plugins: BunliPlugin[] = []
  private combinedStore: TStore = {} as TStore
  private loader = new PluginLoader()
  private logger = createLogger('core:plugin-manager')
  
  /**
   * Load and validate plugins
   */
  async loadPlugins(configs: PluginConfig[]): Promise<void> {
    // Load all plugins
    const loadPromises = configs.map(async (config) => {
      try {
        const plugin = await this.loader.loadPlugin(config)
        this.loader.validatePlugin(plugin)
        return plugin
      } catch (error: any) {
        this.logger.error(`Failed to load plugin: ${error.message}`)
        throw error
      }
    })
    
    this.plugins = await Promise.all(loadPromises)
    
    // Validate no duplicate names
    const names = new Set<string>()
    for (const plugin of this.plugins) {
      if (names.has(plugin.name)) {
        throw new Error(`Duplicate plugin name: ${plugin.name}`)
      }
      names.add(plugin.name)
    }
    
    // Merge all plugin stores into combined store
    this.combinedStore = this.plugins.reduce((acc, plugin) => {
      if (plugin.store) {
        return { ...acc, ...plugin.store }
      }
      return acc
    }, {} as any) as TStore
    
    this.logger.debug(`Loaded ${this.plugins.length} plugins`)
  }
  
  /**
   * Run setup hooks for all plugins
   */
  async runSetup(config: Partial<BunliConfig>): Promise<PluginSetupResult> {
    const context = new PluginContext(
      config,
      new Map(Object.entries(this.combinedStore as any)),
      createLogger('core:plugins'),
      {
        cwd: process.cwd(),
        home: homedir(),
        config: join(homedir(), '.config', config.name || 'bunli')
      }
    )
    
    // Run all setup hooks
    for (const plugin of this.plugins) {
      if (plugin.setup) {
        this.logger.debug(`Running setup for plugin: ${plugin.name}`)
        try {
          await plugin.setup(context)
        } catch (error: any) {
          throw new Error(`Plugin ${plugin.name} setup failed: ${error.message}`)
        }
      }
    }
    
    // Merge all config updates
    const configUpdates = context._getConfigUpdates()
    const mergedConfig = configUpdates.length > 0
      ? deepMerge(config, ...configUpdates)
      : config
    
    return {
      config: mergedConfig,
      commands: context._getCommands(),
      middlewares: context._getMiddlewares()
    }
  }
  
  /**
   * Run configResolved hooks
   */
  async runConfigResolved(config: ResolvedConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.configResolved) {
        this.logger.debug(`Running configResolved for plugin: ${plugin.name}`)
        try {
          await plugin.configResolved(config)
        } catch (error: any) {
          // Log but don't fail - config is already resolved
          this.logger.error(`Plugin ${plugin.name} configResolved error: ${error.message}`)
        }
      }
    }
  }
  
  /**
   * Run beforeCommand hooks
   */
  async runBeforeCommand(
    command: string,
    commandDef: any,
    args: string[],
    flags: Record<string, any>
  ): Promise<CommandContext<TStore>> {
    // Create a mutable copy of the combined store for this command
    const commandStore = { ...this.combinedStore }
    
    const context = new CommandContext(
      command,
      commandDef,
      args,
      flags,
      createEnvironmentInfo(),
      commandStore
    )
    
    // Run all beforeCommand hooks
    for (const plugin of this.plugins) {
      if (plugin.beforeCommand) {
        this.logger.debug(`Running beforeCommand for plugin: ${plugin.name}`)
        try {
          await plugin.beforeCommand(context as any)
        } catch (error: any) {
          throw new Error(`Plugin ${plugin.name} beforeCommand failed: ${error.message}`)
        }
      }
    }
    
    return context
  }
  
  /**
   * Run afterCommand hooks
   */
  async runAfterCommand(
    context: CommandContext<TStore>,
    result: CommandResult
  ): Promise<void> {
    const fullContext = Object.assign(context, result)
    
    // Run all afterCommand hooks
    for (const plugin of this.plugins) {
      if (plugin.afterCommand) {
        this.logger.debug(`Running afterCommand for plugin: ${plugin.name}`)
        try {
          await plugin.afterCommand(fullContext as any)
        } catch (error: any) {
          // Log error but don't fail - command already executed
          this.logger.error(`Plugin ${plugin.name} afterCommand error: ${error.message}`)
        }
      }
    }
  }
  
  /**
   * Get loaded plugins (for debugging/listing)
   */
  getPlugins(): ReadonlyArray<BunliPlugin> {
    return this.plugins
  }
  
  /**
   * Get plugin by name
   */
  getPlugin(name: string): BunliPlugin | undefined {
    return this.plugins.find(p => p.name === name)
  }
}