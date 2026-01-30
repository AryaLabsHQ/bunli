import { bunliConfigSchema, type BunliConfig } from '@bunli/core'
import { createLogger } from '@bunli/core/utils'
import path from 'node:path'
import { existsSync } from 'node:fs'

const logger = createLogger('cli:config')

// Type for loaded config with defaults applied by Zod
export type LoadedConfig = {
  name?: string
  version?: string
  description?: string
  commands?: {
    manifest?: string
    directory?: string
    generateReport?: boolean
  }
  // Zod applies defaults, so these objects are never undefined
  build: {
    entry?: string | string[]
    outdir?: string
    targets: string[]  // Always has default ['native']
    compress: boolean  // Always has default false
    minify: boolean  // Always has default false
    external?: string[]
    sourcemap: boolean  // Always has default true
  }
  dev: {
    watch: boolean  // Always has default true
    inspect: boolean  // Always has default false
    port?: number
  }
  test: {
    pattern: string | string[]  // Always has default ['**/*.test.ts', '**/*.spec.ts']
    coverage: boolean  // Always has default false
    watch: boolean  // Always has default false
  }
  workspace: {
    packages?: string[]
    shared?: any
    versionStrategy: 'fixed' | 'independent'  // Always has default 'fixed'
  }
  release: {
    npm: boolean  // Always has default true
    github: boolean  // Always has default false
    tagFormat: string  // Always has default 'v{{version}}'
    conventionalCommits: boolean  // Always has default true
  }
  plugins: any[]  // Always has default []
}

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

  // Return default config if no file found
  // Zod parse with empty object will apply all defaults
  return bunliConfigSchema.parse({}) as LoadedConfig
}
