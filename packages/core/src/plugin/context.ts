/**
 * Plugin context implementations
 */

import type { 
  PluginContext as IPluginContext, 
  CommandContext as ICommandContext,
  PathInfo,
  EnvironmentInfo,
  Middleware
} from './types.js'
import type { BunliConfig } from '../types.js'
import type { CommandDefinition } from './types.js'
import type { Logger } from '../utils/logger.js'

/**
 * Plugin context implementation for setup phase
 */
export class PluginContext implements IPluginContext {
  private configUpdates: Partial<BunliConfig>[] = []
  private commands: CommandDefinition[] = []
  private middlewares: Middleware[] = []
  
  constructor(
    public readonly config: Partial<BunliConfig>,
    public readonly store: Map<string, any>,
    public readonly logger: Logger,
    public readonly paths: PathInfo
  ) {}
  
  updateConfig(partial: Partial<BunliConfig>): void {
    this.configUpdates.push(partial)
  }
  
  registerCommand(command: CommandDefinition): void {
    this.commands.push(command)
  }
  
  use(middleware: Middleware): void {
    this.middlewares.push(middleware)
  }
  
  // Internal methods for framework use
  _getConfigUpdates(): Partial<BunliConfig>[] {
    return this.configUpdates
  }
  
  _getCommands(): CommandDefinition[] {
    return this.commands
  }
  
  _getMiddlewares(): Middleware[] {
    return this.middlewares
  }
}

/**
 * Command context implementation for command execution
 */
export class CommandContext<TStore = {}> implements ICommandContext<TStore> {
  public readonly store: TStore
  
  constructor(
    public readonly command: string,
    public readonly commandDef: any,
    public readonly args: string[],
    public readonly flags: Record<string, any>,
    public readonly env: EnvironmentInfo,
    initialStore: TStore
  ) {
    this.store = initialStore
  }
  
  /**
   * Type-safe store value access
   * Provides compile-time type checking for store properties
   */
  getStoreValue<K extends keyof TStore>(key: K): TStore[K]
  getStoreValue(key: string | number | symbol): any
  getStoreValue(key: keyof TStore | string | number | symbol): any {
    return (this.store as any)[key]
  }
  
  /**
   * Type-safe store value update
   * Provides compile-time type checking for store property updates
   */
  setStoreValue<K extends keyof TStore>(key: K, value: TStore[K]): void
  setStoreValue(key: string | number | symbol, value: any): void
  setStoreValue(key: keyof TStore | string | number | symbol, value: any): void {
    (this.store as any)[key] = value
  }
  
  /**
   * Check if a store property exists
   */
  hasStoreValue<K extends keyof TStore>(key: K): boolean
  hasStoreValue(key: string | number | symbol): boolean
  hasStoreValue(key: keyof TStore | string | number | symbol): boolean {
    return key in (this.store as object)
  }
}

/**
 * Create environment info from current process
 */
export function createEnvironmentInfo(): EnvironmentInfo {
  return {
    isCI: process.env.CI === 'true' || 
          process.env.CONTINUOUS_INTEGRATION === 'true' ||
          process.env.GITHUB_ACTIONS === 'true' ||
          process.env.GITLAB_CI === 'true' ||
          process.env.CIRCLECI === 'true' ||
          process.env.JENKINS_URL !== undefined
  }
}