/**
 * Core plugin types and interfaces for Bunli
 */

import type { BunliConfigInput, ResolvedConfig } from '../types.js'
import type { Command } from '../types.js'
import type { Logger } from '../utils/logger.js'
import type { Result } from 'better-result'

// Command definition type for plugins
export type CommandDefinition = Command<any>

/**
 * Core plugin interface with store type
 */
export interface BunliPlugin<TStore = {}> {
  /** Unique plugin name */
  name: string
  
  /** Optional plugin version */
  version?: string
  
  /** Plugin store schema/initial state */
  store?: TStore
  
  /** 
   * Setup hook - Called during CLI initialization
   * Can modify configuration and register commands
   */
  setup?(context: PluginContext): void | Promise<void>
  
  /**
   * Config resolved hook - Called after all configuration is finalized
   * Config is now immutable
   */
  configResolved?(config: ResolvedConfig): void | Promise<void>
  
  /**
   * Before command hook - Called before command execution
   * Can inject context and validate
   * Uses generic constraints to preserve store type information
   */
  beforeCommand?(
    context: CommandContext<any>
  ): void | Promise<void>
  
  /**
   * After command hook - Called after command execution
   * Receives result or error from command
   * Uses generic constraints to preserve store type information
   */
  afterCommand?(
    context: CommandContext<any> & CommandResult
  ): void | Promise<void>
}

/**
 * Extract store type from a plugin
 */
export type StoreOf<P> = P extends BunliPlugin<infer S> ? S : {}

/**
 * Merge multiple plugin stores into one type
 */
export type MergeStores<Plugins extends readonly BunliPlugin[]> = 
  Plugins extends readonly []
    ? {}
    : Plugins extends readonly [infer First, ...infer Rest]
      ? First extends BunliPlugin
        ? Rest extends readonly BunliPlugin[]
          ? StoreOf<First> & MergeStores<Rest>
          : StoreOf<First>
        : {}
      : {}

/**
 * Plugin factory function type
 */
export type PluginFactory<TOptions = unknown, TStore = {}> = (options?: TOptions) => BunliPlugin<TStore>

/**
 * Command execution result
 */
export interface CommandResult {
  /** Command return value */
  result?: unknown
  
  /** Error if command failed */
  error?: unknown
  
  /** Exit code */
  exitCode?: number
}

/**
 * Plugin configuration types
 */
export type PluginConfig = 
  | string                    // Path to plugin
  | BunliPlugin              // Plugin object
  | PluginFactory            // Plugin factory function
  | [PluginFactory, unknown]     // Plugin with options

/**
 * Plugin context available during setup
 */
export interface PluginContext {
  /** Current configuration (being built) */
  readonly config: BunliConfigInput
  
  /** Update configuration */
  updateConfig(partial: Partial<BunliConfigInput>): void
  
  /** Register a new command */
  registerCommand(command: CommandDefinition): void
  
  /** Add global middleware */
  use(middleware: Middleware): void
  
  /** Shared storage between plugins */
  readonly store: Map<string, unknown>
  
  /** Plugin logger */
  readonly logger: Logger
  
  /** System paths */
  readonly paths: PathInfo
}

/**
 * Command execution context
 */
export interface CommandContext<TStore = {}> {
  /** Command name being executed */
  readonly command: string
  
  /** The Command object being executed */
  readonly commandDef: Command<any, TStore>
  
  /** Positional arguments */
  readonly args: string[]
  
  /** Parsed flags/options */
  readonly flags: Record<string, unknown>
  
  /** Environment information */
  readonly env: EnvironmentInfo
  
  /** Type-safe context store */
  readonly store: TStore
  
  /** Type-safe store value access */
  getStoreValue<K extends keyof TStore>(key: K): TStore[K]
  getStoreValue(key: string | number | symbol): unknown
  
  /** Type-safe store value update */
  setStoreValue<K extends keyof TStore>(key: K, value: TStore[K]): void
  setStoreValue(key: string | number | symbol, value: unknown): void
  
  /** Check if a store property exists */
  hasStoreValue<K extends keyof TStore>(key: K): boolean
  hasStoreValue(key: string | number | symbol): boolean
}

/**
 * System path information
 */
export interface PathInfo {
  /** Current working directory */
  cwd: string
  
  /** User home directory */
  home: string
  
  /** Config directory path */
  config: string
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  /** Running in CI environment */
  isCI: boolean
}

/**
 * Middleware function type
 */
export type Middleware = (context: CommandContext, next: () => Promise<unknown>) => Promise<unknown>

export type PluginRuntimeResult<T> = Result<T, unknown>

/**
 * Module augmentation for plugin extensions
 */
declare module '@bunli/core' {
  interface PluginStore {
    // Plugins can extend this interface
  }
  
  interface CommandContext {
    // Plugins can extend command context
  }
  
}
