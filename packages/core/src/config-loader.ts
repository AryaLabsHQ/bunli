import { bunliConfigSchema, type BunliConfig } from './config.js'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { createLogger } from './utils/logger.js'

const logger = createLogger('core:config')

// Loaded config with defaults applied by Zod.
// Keep this in lockstep with bunliConfigSchema by reusing its inferred type.
export type LoadedConfig = BunliConfig

// Config file names to search for
const CONFIG_NAMES = [
  'bunli.config.ts',
  'bunli.config.js',
  'bunli.config.mjs'
]

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  // Look for config file
  for (const configName of CONFIG_NAMES) {
    const configPath = path.join(cwd, configName)
    if (existsSync(configPath)) {
      try {
        const module = await import(configPath)
        // Zod parse automatically applies all defaults
        const config = bunliConfigSchema.parse(module.default || module) as LoadedConfig
        return config
      } catch (error) {
        logger.debug('Error loading config from %s: %O', configPath, error)
        throw error
      }
    }
  }

  // Throw error if no config file found
  throw new Error(
    `No configuration file found. Please create one of: ${CONFIG_NAMES.join(', ')}`
  )
}



