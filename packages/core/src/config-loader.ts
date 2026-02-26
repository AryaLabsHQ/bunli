import { bunliConfigSchema, type BunliConfig } from './config.js'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { createLogger } from './utils/logger.js'
import { Result, TaggedError } from 'better-result'

const logger = createLogger('core:config')

export class ConfigNotFoundError extends TaggedError('ConfigNotFoundError')<{
  message: string
  searched: string[]
}>() {}

export class ConfigLoadError extends TaggedError('ConfigLoadError')<{
  message: string
  path: string
  cause: unknown
}>() {}

// Loaded config with defaults applied by Zod.
// Keep this in lockstep with bunliConfigSchema by reusing its inferred type.
export type LoadedConfig = BunliConfig

// Config file names to search for
const CONFIG_NAMES = [
  'bunli.config.ts',
  'bunli.config.js',
  'bunli.config.mjs'
]

export async function loadConfigResult(
  cwd = process.cwd()
): Promise<Result<LoadedConfig, ConfigNotFoundError | ConfigLoadError>> {
  // Look for config file
  for (const configName of CONFIG_NAMES) {
    const configPath = path.join(cwd, configName)
    if (existsSync(configPath)) {
      try {
        const module = await import(configPath)
        // Zod parse automatically applies all defaults
        const config = bunliConfigSchema.parse(module.default || module) as LoadedConfig
        return Result.ok(config)
      } catch (error) {
        logger.debug('Error loading config from %s: %O', configPath, error)
        return Result.err(new ConfigLoadError({
          message: `Failed to load config from ${configPath}`,
          path: configPath,
          cause: error
        }))
      }
    }
  }

  return Result.err(new ConfigNotFoundError({
    message: `No configuration file found. Please create one of: ${CONFIG_NAMES.join(', ')}`,
    searched: CONFIG_NAMES
  }))
}

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const result = await loadConfigResult(cwd)
  if (result.isOk()) {
    return result.value
  }

  throw result.error
}
