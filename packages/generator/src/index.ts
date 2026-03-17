export { Generator } from './generator.js'
export { CommandScanner, isCommandFile } from './scanner.js'
export { parseCommand } from './parser.js'
export { buildTypes } from './builder.js'
export { bunliCodegenPlugin } from './plugin.js'
export {
  ScanCommandFileError,
  ScanCommandsError,
  ParseCommandError,
  WriteTypesError,
  WriteReportError,
  GeneratorRunError
} from './errors.js'
export type { 
  GeneratorConfig, 
  GeneratorEvent, 
  CommandMetadata, 
  OptionMetadata, 
  CommandRegistry 
} from './types.js'
