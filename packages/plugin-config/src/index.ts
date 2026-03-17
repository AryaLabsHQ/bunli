/**
 * Config merger plugin for Bunli
 * Loads configuration from multiple sources and merges them
 */

import { readFile, access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { Result, TaggedError } from 'better-result'
import { createPlugin } from '@bunli/core/plugin'
import { deepMerge } from '@bunli/core/utils'
import type { BunliPlugin } from '@bunli/core/plugin'

export interface ConfigPluginOptions {
  /**
   * Config file sources to load
   * Supports template variables: {{name}} for app name
   * Default: ['~/.config/{{name}}/config.json', '.{{name}}rc', '.{{name}}rc.json']
   */
  sources?: string[]
  
  /**
   * Merge strategy
   * - 'deep': Recursively merge objects (default)
   * - 'shallow': Only merge top-level properties
   */
  mergeStrategy?: 'shallow' | 'deep'
  
  /**
   * Whether to stop on first found config
   * Default: false (loads and merges all found configs)
   */
  stopOnFirst?: boolean
}

class ConfigFileNotFoundError extends TaggedError('ConfigFileNotFoundError')<{
  path: string
  message: string
  cause: unknown
}>() {}

class ConfigFileReadError extends TaggedError('ConfigFileReadError')<{
  path: string
  message: string
  cause: unknown
}>() {}

class ConfigFileParseError extends TaggedError('ConfigFileParseError')<{
  path: string
  message: string
  cause: unknown
}>() {}

type ReadConfigError =
  | ConfigFileNotFoundError
  | ConfigFileReadError
  | ConfigFileParseError

/**
 * Config merger plugin factory
 */
export const configMergerPlugin = createPlugin<ConfigPluginOptions, {}>((options = {}) => {
  const sources = options.sources || [
    '~/.config/{{name}}/config.json',
    '.{{name}}rc',
    '.{{name}}rc.json',
    '.config/{{name}}.json'
  ]
  
  return {
    name: '@bunli/plugin-config',
    version: '1.0.0',
    
    async setup(context) {
      const appName = context.config.name || 'bunli'
      const configs: Array<Record<string, unknown>> = []
      
      for (const source of sources) {
        // Resolve template variables and home directory
        const configPath = source
          .replace(/^~/, homedir())
          .replace(/\{\{name\}\}/g, appName)

        const loadedConfig = await readConfigSource(configPath)
        if (Result.isError(loadedConfig)) {
          if (ConfigFileNotFoundError.is(loadedConfig.error)) {
            context.logger.debug(`Config file not found: ${configPath}`)
            continue
          }

          if (ConfigFileParseError.is(loadedConfig.error)) {
            context.logger.warn(`Failed to parse config file ${configPath}: ${loadedConfig.error.message}`)
            continue
          }

          context.logger.warn(`Failed to load config file ${configPath}: ${loadedConfig.error.message}`)
          continue
        }

        configs.push(loadedConfig.value)
        context.logger.debug(`Loaded config from ${configPath}`)

        // Stop if requested
        if (options.stopOnFirst) {
          break
        }
      }
      
      if (configs.length > 0) {
        // Merge all found configs
        let merged: Record<string, unknown>
        
        if (options.mergeStrategy === 'shallow') {
          merged = Object.assign({}, ...configs) as Record<string, unknown>
        } else {
          // Deep merge is already available
          merged = deepMerge(...configs) as Record<string, unknown>
        }
        
        context.updateConfig(merged)
        context.logger.info(`Merged ${configs.length} config file(s)`)
      }
    }
  }
})

// Default export for convenience
export default configMergerPlugin

async function readConfigSource(path: string): Promise<Result<Record<string, unknown>, ReadConfigError>> {
  const existsResult = await Result.tryPromise({
    try: async () => {
      await access(path)
    },
    catch: (cause) =>
      new ConfigFileNotFoundError({
        path,
        message: `Config file not found: ${path}`,
        cause
      })
  })
  if (Result.isError(existsResult)) {
    return existsResult
  }

  const readResult = await Result.tryPromise({
    try: async () => await readFile(path, 'utf-8'),
    catch: (cause) =>
      new ConfigFileReadError({
        path,
        message: `Unable to read config file: ${path}`,
        cause
      })
  })
  if (Result.isError(readResult)) {
    return readResult
  }

  return Result.try({
    try: () => {
      const parsed = JSON.parse(readResult.value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Config file must contain a JSON object')
      }
      return parsed as Record<string, unknown>
    },
    catch: (cause) =>
      new ConfigFileParseError({
        path,
        message: `Invalid JSON in config file: ${path}`,
        cause
      })
  })
}
