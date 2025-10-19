import type { StandardSchemaV1 } from '@standard-schema/spec'

export type { StandardSchemaV1 }

export type RenderResult = unknown

export interface TuiRenderOptions {
  exitOnCtrlC?: boolean
  targetFps?: number
  enableMouseMovement?: boolean
  [key: string]: unknown
}

export interface RenderArgs<TFlags = Record<string, unknown>, TStore = {}> extends HandlerArgs<TFlags, TStore> {
  command: Command<any, TStore>
  rendererOptions?: TuiRenderOptions
}

export type RenderFunction<TFlags = Record<string, unknown>, TStore = {}> = (args: RenderArgs<TFlags, TStore>) => RenderResult

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
interface BaseCommand<TOptions extends Options = Options, TStore = {}> {
  name: string
  description: string
  options?: TOptions
  commands?: Command<any, TStore>[]
  alias?: string | string[]
  handler?: Handler<InferOptions<TOptions>, TStore>
  render?: RenderFunction<InferOptions<TOptions>, TStore>
}

export type Command<TOptions extends Options = Options, TStore = {}> =
  | (BaseCommand<TOptions, TStore> & { handler: Handler<InferOptions<TOptions>, TStore> })
  | (BaseCommand<TOptions, TStore> & { render: RenderFunction<InferOptions<TOptions>, TStore> })
  | (BaseCommand<TOptions, TStore> & {
      handler: Handler<InferOptions<TOptions>, TStore>
      render: RenderFunction<InferOptions<TOptions>, TStore>
    })

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
  command: Command<TOptions, TStore>
): Command<TOptions, TStore> {
  return command
}

// Config types
export interface BunliConfig {
  name: string
  version: string
  description?: string
  
  // Codegen configuration
  codegen?: {
    enabled?: boolean
    commandsDir?: string
    output?: string
    watch?: boolean
  }
  
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