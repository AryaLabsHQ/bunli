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
import type { BunliConfigInput } from '../types.js'
import type { CommandDefinition } from './types.js'
import type { Logger } from '../utils/logger.js'

/**
 * Plugin context implementation for setup phase
 */
export class PluginContext implements IPluginContext {
  private configUpdates: Partial<BunliConfigInput>[] = []
  private commands: CommandDefinition[] = []
  private middlewares: Middleware[] = []
  
  constructor(
    public readonly config: BunliConfigInput,
    public readonly store: Map<string, unknown>,
    public readonly logger: Logger,
    public readonly paths: PathInfo
  ) {}
  
  updateConfig(partial: Partial<BunliConfigInput>): void {
    this.configUpdates.push(partial)
  }
  
  registerCommand(command: CommandDefinition): void {
    this.commands.push(command)
  }
  
  use(middleware: Middleware): void {
    this.middlewares.push(middleware)
  }
  
  // Internal methods for framework use
  _getConfigUpdates(): Partial<BunliConfigInput>[] {
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
    public readonly commandDef: CommandDefinition,
    public readonly args: string[],
    public readonly flags: Record<string, unknown>,
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
  getStoreValue(key: string | number | symbol): unknown
  getStoreValue(key: keyof TStore | string | number | symbol): unknown {
    const storeRecord = this.store as Record<string | number | symbol, unknown>
    return storeRecord[key]
  }
  
  /**
   * Type-safe store value update
   * Provides compile-time type checking for store property updates
   */
  setStoreValue<K extends keyof TStore>(key: K, value: TStore[K]): void
  setStoreValue(key: string | number | symbol, value: unknown): void
  setStoreValue(key: keyof TStore | string | number | symbol, value: unknown): void {
    const storeRecord = this.store as Record<string | number | symbol, unknown>
    storeRecord[key] = value
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
