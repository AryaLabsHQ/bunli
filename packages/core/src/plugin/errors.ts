import { TaggedError } from 'better-result'

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return String(error)
}

export class PluginLoadError extends TaggedError('PluginLoadError')<{
  message: string
  plugin: string
  cause: unknown
}>() {}

export class PluginValidationError extends TaggedError('PluginValidationError')<{
  message: string
  plugin: string
}>() {}

export class PluginHookError extends TaggedError('PluginHookError')<{
  message: string
  plugin: string
  hook: 'setup' | 'beforeCommand'
  cause: unknown
}>() {}
