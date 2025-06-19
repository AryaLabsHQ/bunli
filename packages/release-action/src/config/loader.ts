import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { load as loadYaml } from 'js-yaml'
import { getDefaults } from './defaults.js'
import { validateConfig } from './schema.js'
import type { BunliReleaseConfig } from '../types.js'

export class ConfigLoader {
  async load(configPath: string): Promise<BunliReleaseConfig> {
    // Check if config file exists
    if (!existsSync(configPath)) {
      console.log(`Config file not found at ${configPath}, using defaults`)
      return getDefaults()
    }

    try {
      // Read and parse YAML config
      const content = await readFile(configPath, 'utf-8')
      const rawConfig = loadYaml(content) as any

      // Validate config
      const validatedConfig = validateConfig(rawConfig)

      // Merge with defaults
      return this.mergeWithDefaults(validatedConfig)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`)
      }
      throw error
    }
  }

  private mergeWithDefaults(config: Partial<BunliReleaseConfig>): BunliReleaseConfig {
    const defaults = getDefaults()

    return {
      version: config.version ?? defaults.version,
      project: {
        ...defaults.project,
        ...config.project
      },
      builds: config.builds ?? defaults.builds,
      archives: config.archives ?? defaults.archives,
      checksum: {
        ...defaults.checksum,
        ...config.checksum
      },
      changelog: {
        ...defaults.changelog,
        ...config.changelog
      },
      npm: config.npm ? {
        ...defaults.npm,
        ...config.npm
      } : undefined,
      homebrew: config.homebrew,
      release: {
        ...defaults.release,
        ...config.release
      }
    }
  }
}