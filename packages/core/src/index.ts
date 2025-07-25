// Note: createCLI is now async and returns Promise<CLI>
export { createCLI } from './cli.js'
export { defineCommand, defineConfig, option } from './types.js'
export { SchemaError } from '@standard-schema/utils'
export type {
  CLI,
  Command,
  Handler,
  HandlerArgs,
  Options,
  CLIOption,
  BunliConfig,
  CommandManifest,
  CommandLoader,
  StandardSchemaV1,
  PluginConfig,
  ResolvedConfig
} from './types.js'

// Note: Plugin system is exported via subpath export
// Usage: import { PluginManager, createPlugin } from '@bunli/core/plugin'