import type { StandardSchemaV1 } from '@standard-schema/spec'

// Re-export for convenience
export type { StandardSchemaV1 }

// Core Bunli types
export interface CLI {
  command<T extends Flags = Flags>(cmd: Command<T>): void
  load(manifest: CommandManifest): Promise<void>
  init(): Promise<void>
  run(argv?: string[]): Promise<void>
}

export interface Command<T extends Flags = Flags> {
  name: string
  description: string
  handler?: Handler<T>
  options?: Options<T>
  commands?: Command[]
  alias?: string | string[]
}

export type Handler<T extends Flags> = (args: HandlerArgs<T>) => void | Promise<void>

export interface HandlerArgs<T extends Flags = Flags> {
  flags: T
  positional: string[]
  shell: typeof Bun.$
  env: typeof process.env
  cwd: string
  // Utilities will be added later
  // prompt: PromptUtils
  // spinner: SpinnerUtils
  // colors: typeof Bun.color
}

export type Flags = Record<string, unknown>

export type Options<T extends Flags> = {
  [K in keyof T]: Option<T[K]>
}

export interface Option<T> {
  type: 'string' | 'number' | 'boolean'
  short?: string
  description?: string
  default?: T
  required?: boolean
  choices?: readonly T[]
  schema?: StandardSchemaV1<unknown, T>
}

// Command manifest for lazy loading
export type CommandManifest = {
  [key: string]: CommandLoader | CommandManifest
}

export type CommandLoader = () => Promise<{ default: Command }>

// Define command helper
export interface DefineCommandOptions<T extends Flags = Flags> extends Omit<Command<T>, 'handler'> {
  handler: Handler<T>
}

export function defineCommand<T extends Flags = Flags>(options: DefineCommandOptions<T>): Command<T> {
  return options as Command<T>
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