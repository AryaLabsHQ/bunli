/**
 * Core plugin types and interfaces for Bunli
 */

import type { BunliConfig, ResolvedConfig } from '../types.js'
import type { Command } from '../types.js'
import type { Logger } from '../utils/logger.js'

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
   */
  beforeCommand?(context: CommandContext<TStore>): void | Promise<void>
  
  /**
   * After command hook - Called after command execution
   * Receives result or error from command
   */
  afterCommand?(context: CommandContext<TStore> & CommandResult): void | Promise<void>
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
export type PluginFactory<TOptions = any, TStore = {}> = (options?: TOptions) => BunliPlugin<TStore>

/**
 * Command execution result
 */
export interface CommandResult {
  /** Command return value */
  result?: any
  
  /** Error if command failed */
  error?: Error
  
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
  | [PluginFactory, any]     // Plugin with options

/**
 * Plugin context available during setup
 */
export interface PluginContext {
  /** Current configuration (being built) */
  readonly config: Partial<BunliConfig>
  
  /** Update configuration */
  updateConfig(partial: Partial<BunliConfig>): void
  
  /** Register a new command */
  registerCommand(command: CommandDefinition): void
  
  /** Add global middleware */
  use(middleware: Middleware): void
  
  /** Shared storage between plugins */
  readonly store: Map<string, any>
  
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
  
  /** Positional arguments */
  readonly args: string[]
  
  /** Parsed flags/options */
  readonly flags: Record<string, any>
  
  /** Environment information */
  readonly env: EnvironmentInfo
  
  /** Type-safe context store */
  readonly store: TStore
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
export type Middleware = (context: CommandContext, next: () => Promise<any>) => Promise<any>

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
  
  interface BunliConfig {
    // Plugins can extend config
  }
}