/**
 * Plugin lifecycle manager
 */

import { homedir } from 'os'
import { join } from 'path'
import { PluginLoader } from './loader.js'
import { PluginContext, CommandContext, createEnvironmentInfo } from './context.js'
import { deepMerge } from '../utils/merge.js'
import { createLogger } from '../utils/logger.js'
import { Result } from 'better-result'
import {
  PluginLoadError,
  PluginHookError,
  PluginValidationError,
  toErrorMessage
} from './errors.js'
import type { 
  BunliPlugin, 
  PluginConfig, 
  CommandResult,
  CommandDefinition,
  Middleware
} from './types.js'
import type { BunliConfig, ResolvedConfig } from '../types.js'
import type { Command } from '../types.js'

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
    const result = await this.loadPluginsResult(configs)
    if (result.isErr()) {
      throw new Error(result.error.message)
    }
  }

  async loadPluginsResult(configs: PluginConfig[]): Promise<Result<void, PluginValidationError | PluginLoadError>> {
    // Load all plugins
    const loadPromises = configs.map(async (config) => {
      const pluginResult = await this.loader.loadPluginResult(config)
      if (pluginResult.isErr()) {
        this.logger.error(`Failed to load plugin: ${pluginResult.error.message}`)
        return pluginResult
      }

      const plugin = pluginResult.value
      const validateResult = this.loader.validatePluginResult(plugin)
      if (validateResult.isErr()) {
        this.logger.error(`Failed to validate plugin: ${validateResult.error.message}`)
        return validateResult
      }

      return Result.ok(plugin)
    })

    const loaded = await Promise.all(loadPromises)
    const firstError = loaded.find((result) => result.isErr())
    if (firstError?.isErr()) {
      return Result.err(firstError.error)
    }

    this.plugins = []
    for (const result of loaded) {
      if (result.isOk()) {
        this.plugins.push(result.value)
      }
    }
    
    // Validate no duplicate names
    const names = new Set<string>()
    for (const plugin of this.plugins) {
      if (names.has(plugin.name)) {
        return Result.err(new PluginValidationError({
          message: `Duplicate plugin name: ${plugin.name}`,
          plugin: plugin.name
        }))
      }
      names.add(plugin.name)
    }
    
    // Merge all plugin stores into combined store
    this.combinedStore = this.plugins.reduce<Record<string, unknown>>((acc, plugin) => {
      if (plugin.store) {
        return { ...acc, ...(plugin.store as Record<string, unknown>) }
      }
      return acc
    }, {}) as TStore
    
    this.logger.debug(`Loaded ${this.plugins.length} plugins`)
    return Result.ok(undefined)
  }
  
  /**
   * Run setup hooks for all plugins
   */
  async runSetup(config: Partial<BunliConfig>): Promise<PluginSetupResult> {
    const result = await this.runSetupResult(config)
    if (result.isErr()) {
      throw new Error(result.error.message)
    }
    return result.value
  }

  async runSetupResult(
    config: Partial<BunliConfig>
  ): Promise<Result<PluginSetupResult, PluginHookError>> {
    const context = new PluginContext(
      config,
      new Map(Object.entries(this.combinedStore as Record<string, unknown>)),
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
        } catch (error) {
          return Result.err(new PluginHookError({
            message: `Plugin ${plugin.name} setup failed: ${toErrorMessage(error)}`,
            plugin: plugin.name,
            hook: 'setup',
            cause: error
          }))
        }
      }
    }
    
    // Merge all config updates
    const configUpdates = context._getConfigUpdates()
    const mergedConfig = configUpdates.length > 0
      ? deepMerge(config, ...configUpdates)
      : config
    
    return Result.ok({
      config: mergedConfig,
      commands: context._getCommands(),
      middlewares: context._getMiddlewares()
    })
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
        } catch (error) {
          // Log but don't fail - config is already resolved
          this.logger.error(`Plugin ${plugin.name} configResolved error: ${toErrorMessage(error)}`)
        }
      }
    }
  }
  
  /**
   * Run beforeCommand hooks
   */
  async runBeforeCommand(
    command: string,
    commandDef: Command<any, TStore>,
    args: string[],
    flags: Record<string, unknown>
  ): Promise<CommandContext<TStore>> {
    const result = await this.runBeforeCommandResult(command, commandDef, args, flags)
    if (result.isErr()) {
      throw new Error(result.error.message)
    }
    return result.value
  }

  async runBeforeCommandResult(
    command: string,
    commandDef: Command<any, TStore>,
    args: string[],
    flags: Record<string, unknown>
  ): Promise<Result<CommandContext<TStore>, PluginHookError>> {
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
          await plugin.beforeCommand(context)
        } catch (error) {
          return Result.err(new PluginHookError({
            message: `Plugin ${plugin.name} beforeCommand failed: ${toErrorMessage(error)}`,
            plugin: plugin.name,
            hook: 'beforeCommand',
            cause: error
          }))
        }
      }
    }
    
    return Result.ok(context)
  }
  
  /**
   * Run afterCommand hooks
   */
  async runAfterCommand(
    context: CommandContext<TStore>,
    result: CommandResult
  ): Promise<void> {
    const fullContext = Object.assign(
      context,
      result
    ) as CommandContext<TStore> & CommandResult
    
    // Run all afterCommand hooks
    for (const plugin of this.plugins) {
      if (plugin.afterCommand) {
        this.logger.debug(`Running afterCommand for plugin: ${plugin.name}`)
        try {
          await plugin.afterCommand(fullContext)
        } catch (error) {
          // Log error but don't fail - command already executed
          this.logger.error(`Plugin ${plugin.name} afterCommand error: ${toErrorMessage(error)}`)
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
