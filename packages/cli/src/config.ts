import { bunliConfigSchema, type BunliConfig } from '@bunli/core'
import { createLogger } from '@bunli/core/utils'
import path from 'node:path'
import { existsSync } from 'node:fs'

const logger = createLogger('cli:config')

// Type for loaded config with defaults applied by Zod
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
        const config = bunliConfigSchema.parse(module.default || module)
        return config
      } catch (error) {
        logger.debug('Error loading config from %s: %O', configPath, error)
        throw error
      }
    }
  }

  // Return default config if no file found
  // Zod parse with empty object will apply all defaults
  return bunliConfigSchema.parse({})
}
