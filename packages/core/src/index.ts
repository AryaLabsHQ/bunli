// Note: createCLI is now async and returns Promise<CLI>
export { createCLI } from './cli.js'
export { defineCommand, option } from './types.js'
export { defineConfig, bunliConfigSchema, type BunliConfig, type BunliConfigInput } from './config.js'
export { loadConfig, loadConfigResult } from './config-loader.js'
export {
  createGeneratedHelpers,
  registerGeneratedStore,
  getGeneratedStores,
  clearGeneratedStores,
  type GeneratedStore,
  type GeneratedCommandMeta,
  type GeneratedOptionMeta,
  type GeneratedExecutor
} from './generated.js'
export { SchemaError } from '@standard-schema/utils'
export type {
  CLI,
  Command,
  Handler,
  HandlerArgs,
  RenderArgs,
  RenderFunction,
  TuiRenderOptions,
  Options,
  CLIOption,
  CommandManifest,
  CommandLoader,
  StandardSchemaV1,
  PluginConfig,
  ResolvedConfig,
  TerminalInfo,
  RuntimeInfo,
  HelpRenderContext,
  HelpRenderer,
  RenderResult,
  RegisteredCommands,
  CommandOptions
} from './types.js'

// Export global flags
export { GLOBAL_FLAGS } from './global-flags.js'
export type { GlobalFlags } from './global-flags.js'

// Export TUI registry
export { registerTuiRenderer, clearTuiRenderer, getTuiRenderer } from './tui/registry.js'

// Note: Plugin system is exported via subpath export
// Usage: import { PluginManager, createPlugin } from '@bunli/core/plugin'

// Export validation utilities
export {
  validateValue,
  validateValues,
  isValueOfType,
  createValidator,
  createBatchValidator
} from './validation.js'

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

// Export Result utilities
export {
  Result,
  Ok,
  Err,
  TaggedError,
  UnhandledException,
  matchError,
  matchErrorPartial
} from 'better-result'
export type { TaggedErrorClass, TaggedErrorInstance } from 'better-result'
export {
  ConfigNotFoundError,
  ConfigLoadError
} from './config-loader.js'
export {
  InvalidConfigError,
  CommandNotFoundError,
  CommandExecutionError,
  OptionValidationError
} from './cli.js'
export {
  PluginLoadError,
  PluginValidationError,
  PluginHookError,
  toErrorMessage
} from './plugin/errors.js'
