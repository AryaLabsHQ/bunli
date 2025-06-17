import type { StandardSchemaV1 } from '@standard-schema/spec'

// Re-export for convenience
export type { StandardSchemaV1 }

// Core Bunli types
export interface CLI {
  command(cmd: Command): void
  load(manifest: CommandManifest): Promise<void>
  init(): Promise<void>
  run(argv?: string[]): Promise<void>
}

// generic Command type that carries options type information
export interface Command<TOptions extends Options = Options> {
  name: string
  description: string
  handler?: Handler<InferOptions<TOptions>>
  options?: TOptions
  commands?: Command[]
  alias?: string | string[]
}

// Type helper to extract output types from StandardSchemaV1
type InferSchema<T> = T extends StandardSchemaV1<any, infer Out>
  ? Out
  : never

type InferOptions<T extends Options> = {
  [K in keyof T]: T[K] extends CLIOption<infer S>
    ? InferSchema<S>
    : InferSchema<T[K]>
}

// generic Handler type that accepts inferred flags type
export type Handler<TFlags = Record<string, unknown>> = (args: HandlerArgs<TFlags>) => void | Promise<void>

// generic HandlerArgs that accepts flags type
export interface HandlerArgs<TFlags = Record<string, unknown>> {
  flags: TFlags
  positional: string[]
  shell: typeof Bun.$
  env: typeof process.env
  cwd: string
  // Utilities
  prompt: typeof import('@bunli/utils').prompt
  spinner: typeof import('@bunli/utils').spinner
  colors: typeof import('@bunli/utils').colors
}

// CLI option with metadata - generic to preserve schema type
export interface CLIOption<S extends StandardSchemaV1 = StandardSchemaV1> {
  schema: S
  short?: string
  description?: string
}

// Options can be either a schema directly or a CLIOption with metadata
export type Options = Record<string, StandardSchemaV1 | CLIOption<any>>

// Command manifest for lazy loading
export type CommandManifest = {
  [key: string]: CommandLoader | CommandManifest
}

export type CommandLoader = () => Promise<{ default: Command }>

// Define command helper with proper type inference
export function defineCommand<TOptions extends Options>(
  command: Omit<Command<TOptions>, 'handler'> & {
    handler?: (args: HandlerArgs<InferOptions<TOptions>>) => void | Promise<void>
  }
): Command<TOptions> {
  return command as Command<TOptions>
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
}

export function defineConfig(config: BunliConfig): BunliConfig {
  return config
}

// Helper to create a CLI option with metadata
export function option<S extends StandardSchemaV1>(
  schema: S,
  metadata: { short?: string; description?: string }
): CLIOption<S> {
  return {
    schema,
    ...metadata
  }
}