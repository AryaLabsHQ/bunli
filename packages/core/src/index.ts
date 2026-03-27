// Note: createCLI is now async and returns Promise<CLI>
export { createCLI } from './cli.js'
export { defineCommand, defineGroup, defineOption } from './types.js'
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
  TuiImageOptions,
  ResolvedTuiImageOptions,
  Options,
  CLIOption,
  Group,
  RunnableCommand,
  StandardSchemaV1,
  PluginConfig,
  ResolvedConfig,
  TerminalInfo,
  RuntimeInfo,
  HelpRenderContext,
  HelpRenderer,
  RenderResult,
  PromptApi,
  PromptSpinnerFactory,
  RegisteredCommands,
  CommandOptions
} from './types.js'

// Export global flags
export { GLOBAL_FLAGS } from './global-flags.js'
export type { GlobalFlags } from './global-flags.js'

// Note: Plugin system is exported via subpath export
// Usage: import { PluginManager, definePlugin } from '@bunli/core/plugin'

// Export validation utilities
export {
  validateValue,
  validateValues,
  isValueOfType,
  createValidator,
  createBatchValidator
} from './validation.js'

// Export coercion utilities
export { coerceValue, coerceArray } from './coerce.js'
export type { CoercionResult } from './coerce.js'

// Export file/directory validation combinators
export { file, directory } from './fs-validators.js'
export type { FileValidatorOptions, DirectoryValidatorOptions } from './fs-validators.js'

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
  AggregateValidationError,
  BunliValidationError,
  InvalidConfigError,
  CommandNotFoundError,
  CommandExecutionError,
  OptionValidationError
} from './errors.js'
export type { ValidationIssue } from './errors.js'
export {
  PluginLoadError,
  PluginValidationError,
  PluginHookError,
  toErrorMessage
} from './plugin/errors.js'

// Export output system
export { format as formatOutput } from './output/formatter.js'
export { serializeCliError } from './output/serialize.js'
export { resolveFormat, shouldRenderOutput } from './output/policy.js'
export type {
  OutputFormat,
  OutputPolicy,
  OutputMeta,
  OutputEnvelope
} from './output/types.js'
export type { SerializedCliError, SerializedCliIssue } from './output/serialize.js'

// Export help rendering
export {
  showHelp,
  renderRootHelp,
  renderCommandHelp,
  collectTopLevelCommands,
  wrapText,
  formatTwoColumnRows
} from './help/index.js'
export type { HelpContext } from './help/index.js'

// Export manifest system
export {
  renderIndex as renderManifestIndex,
  renderFull as renderManifestFull,
  toJsonSchema,
  resolveTypeName
} from './manifest/index.js'
