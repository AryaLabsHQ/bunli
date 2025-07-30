import type { StandardSchemaV1 } from '@standard-schema/spec'

export type { StandardSchemaV1 }

// Core Bunli types
/**
 * CLI instance with plugin type information
 */
export interface CLI<TStore = {}> {
  /**
   * Register a command
   */
  command(command: Command<any, TStore>): void
  
  /**
   * Load commands from a manifest
   */
  load(manifest: CommandManifest): Promise<void>
  
  /**
   * Initialize the CLI (load config, etc)
   */
  init(): Promise<void>
  
  /**
   * Run the CLI with given arguments
   */
  run(argv?: string[]): Promise<void>
}

// generic Command type that carries options type information
export interface Command<TOptions extends Options = Options, TStore = {}> {
  name: string
  description: string
  handler?: Handler<InferOptions<TOptions>, TStore>
  options?: TOptions
  commands?: Command<any, TStore>[]  // Allow any options type for subcommands
  alias?: string | string[]
  // TUI configuration
  tui?: TuiConfig | TuiRenderer<TOptions, TStore>
}

// TUI configuration for commands
export interface TuiConfig {
  // Custom UI component/view for this command
  component?: string | (() => any)
  // Disable auto-form generation
  disableAutoForm?: boolean
  // Custom key handlers
  keyHandlers?: KeyHandler[]
}

export interface KeyHandler {
  key: string
  handler: (event: KeyboardEvent) => void | boolean
}

// Function that returns a custom TUI for the command
export type TuiRenderer<TOptions extends Options = Options, TStore = {}> = (
  context: TuiContext<TOptions, TStore>
) => any | Promise<any>

export interface TuiContext<TOptions extends Options = Options, TStore = {}> {
  command: Command<TOptions, TStore>
  args: string[]
  store?: TStore
}

// Type helper to extract output types from StandardSchemaV1
type InferSchema<T> = T extends StandardSchemaV1<any, infer Out>
  ? Out
  : never

type InferOptions<T extends Options> = {
  [K in keyof T]: T[K] extends CLIOption<infer S>
    ? InferSchema<S>
    : never
}

// generic Handler type that accepts inferred flags type
export type Handler<TFlags = Record<string, unknown>, TStore = {}> = (args: HandlerArgs<TFlags, TStore>) => void | Promise<void>

// generic HandlerArgs that accepts flags type
export interface HandlerArgs<TFlags = Record<string, unknown>, TStore = {}> {
  flags: TFlags
  positional: string[]
  shell: typeof Bun.$
  env: typeof process.env
  cwd: string
  // Utilities
  prompt: typeof import('@bunli/utils').prompt
  spinner: typeof import('@bunli/utils').spinner
  colors: typeof import('@bunli/utils').colors
  // Plugin context (if plugins are loaded)
  context?: import('./plugin/types.js').CommandContext<TStore>
  // Terminal information
  terminal: TerminalInfo
  // Runtime information
  runtime: RuntimeInfo
}

export interface TerminalInfo {
  width: number
  height: number
  isInteractive: boolean
  isCI: boolean
  supportsColor: boolean
  supportsMouse: boolean
}

export interface RuntimeInfo {
  startTime: number
  args: string[]
  command: string
}

// CLI option with metadata - generic to preserve schema type
export interface CLIOption<S extends StandardSchemaV1 = StandardSchemaV1> {
  schema: S
  short?: string
  description?: string
}

// Options must use the CLIOption wrapper
export type Options = Record<string, CLIOption<any>>

// Command manifest for lazy loading
export type CommandManifest = {
  [key: string]: CommandLoader | CommandManifest
}

export type CommandLoader = () => Promise<{ default: Command<any> }>

// Define command helper with proper type inference
export function defineCommand<TOptions extends Options = Options, TStore = {}>(
  command: Omit<Command<TOptions, TStore>, 'handler'> & {
    handler?: (args: HandlerArgs<InferOptions<TOptions>, TStore>) => void | Promise<void>
  }
): Command<TOptions, TStore> {
  return command as Command<TOptions, TStore>
}

// Config types
export interface BunliConfig {
  name: string
  version: string
  description?: string
  commands?: {
    manifest?: string
    discover?: string
  }
  build?: {
    entry?: string
    outdir?: string
    targets?: string[]
    compress?: boolean
  }
  dev?: {
    watch?: boolean
    inspect?: boolean
  }
  plugins?: PluginConfig[]
}

// Plugin configuration type (imported from plugin/types)
export type PluginConfig = import('./plugin/types.js').PluginConfig

// Resolved config after all plugins have run
export interface ResolvedConfig extends Required<BunliConfig> {
  // All optional fields are now required with defaults
}

export function defineConfig(config: BunliConfig): BunliConfig {
  return config
}

// Helper to create a CLI option with metadata
export function option<S extends StandardSchemaV1>(
  schema: S,
  metadata?: { short?: string; description?: string }
): CLIOption<S> {
  return {
    schema,
    ...metadata
  }
}