import { TaggedError } from 'better-result'

export class SchemaConversionError extends TaggedError('SchemaConversionError')<{
  path: string
  message: string
  cause: unknown
}>() {}

export class ConvertToolsError extends TaggedError('ConvertToolsError')<{
  toolName: string
  message: string
  cause: unknown
}>() {}

export class GenerateMCPTypesError extends TaggedError('GenerateMCPTypesError')<{
  outputDir: string
  message: string
  cause: unknown
}>() {}

export class McpToolsProviderError extends TaggedError('McpToolsProviderError')<{
  message: string
  cause: unknown
}>() {}
