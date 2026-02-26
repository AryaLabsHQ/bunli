import { TaggedError } from 'better-result'

export class ScanCommandFileError extends TaggedError('ScanCommandFileError')<{
  filePath: string
  message: string
  cause: unknown
}>() {}

export class ScanCommandsError extends TaggedError('ScanCommandsError')<{
  commandsDir: string
  message: string
  cause: unknown
}>() {}

export class ParseCommandError extends TaggedError('ParseCommandError')<{
  filePath: string
  message: string
  cause: unknown
}>() {}

export class WriteTypesError extends TaggedError('WriteTypesError')<{
  outputFile: string
  message: string
  cause: unknown
}>() {}

export class WriteReportError extends TaggedError('WriteReportError')<{
  reportFile: string
  message: string
  cause: unknown
}>() {}

export class GeneratorRunError extends TaggedError('GeneratorRunError')<{
  message: string
  cause: unknown
}>() {}
