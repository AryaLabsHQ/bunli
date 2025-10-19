// Note: createCLI is now async and returns Promise<CLI>
export { createCLI } from './cli.js'
export { defineCommand, defineConfig, option } from './types.js'
export { SchemaError } from '@standard-schema/utils'
export type {
  CLI,
  Command,
  Handler,
  HandlerArgs,
  RenderArgs,
  RenderFunction,
  Options,
  CLIOption,
  BunliConfig,
  CommandManifest,
  CommandLoader,
  StandardSchemaV1,
  PluginConfig,
  ResolvedConfig,
  TerminalInfo,
  RuntimeInfo,
  RenderResult
} from './types.js'

// Export global flags
export { GLOBAL_FLAGS } from './global-flags.js'
export type { GlobalFlags } from './global-flags.js'

// Export TUI registry
export { registerTuiRenderer, clearTuiRenderer, getTuiRenderer } from './tui/registry.js'

// Note: Plugin system is exported via subpath export
// Usage: import { PluginManager, createPlugin } from '@bunli/core/plugin'

// Export type utilities
export type {
  UnionToIntersection,
  Constrain,
  PickRequired,
  PickOptional,
  ExtractPrimitives,
  ExtractObjects,
  PartialMergeAll,
  MergeAllObjects,
  MergeAll,
  NoInfer,
  IsAny,
  PickAsRequired,
  WithoutEmpty,
  Expand,
  DeepPartial,
  MakeDifferenceOptional,
  IsUnion,
  IsNonEmptyObject,
  Assign,
  IntersectAssign
} from './utils/type-helpers.js'