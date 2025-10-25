import { bunliConfigSchema, type BunliConfig } from '@bunli/core'
import path from 'node:path'
import { existsSync } from 'node:fs'

// Type for loaded config with defaults applied
export type LoadedConfig = {
  name?: string
  version?: string
  description?: string
  commands?: {
    manifest?: string
    directory?: string
    generateReport?: boolean
  }
  build: {
    entry?: string | string[]
    outdir?: string
    targets?: string[]
    compress?: boolean
    minify?: boolean
    external?: string[]
    sourcemap?: boolean
  }
  dev: {
    watch?: boolean
    inspect?: boolean
    port?: number
  }
  test: {
    pattern?: string | string[]
    coverage?: boolean
    watch?: boolean
  }
  workspace: {
    packages?: string[]
    shared?: any
    versionStrategy?: 'fixed' | 'independent'
  }
  release: {
    npm?: boolean
    github?: boolean
    tagFormat?: string
    conventionalCommits?: boolean
  }
  plugins?: any[]
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
        const config = bunliConfigSchema.parse(module.default || module)
        return {
          ...config,
          build: {
            targets: ['native'],
            compress: false,
            minify: false,
            sourcemap: true,
            ...config.build
          },
          dev: {
            watch: true,
            inspect: false,
            ...config.dev
          },
          test: {
            pattern: ['**/*.test.ts', '**/*.spec.ts'],
            coverage: false,
            watch: false,
            ...config.test
          },
          workspace: {
            versionStrategy: 'fixed',
            ...config.workspace
          },
          release: {
            npm: true,
            github: false,
            tagFormat: 'v{{version}}',
            conventionalCommits: true,
            ...config.release
          }
        }
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error)
        throw error
      }
    }
  }
  
  // Return default config if no file found (codegen is non-configurable)
  return {
    build: {
      targets: ['native'],
      compress: false,
      minify: false,
      sourcemap: true
    },
    dev: {
      watch: true,
      inspect: false
    },
    test: {
      pattern: ['**/*.test.ts', '**/*.spec.ts'],
      coverage: false,
      watch: false
    },
    workspace: {
      versionStrategy: 'fixed'
    },
    release: {
      npm: true,
      github: false,
      tagFormat: 'v{{version}}',
      conventionalCommits: true
    }
  }
}
