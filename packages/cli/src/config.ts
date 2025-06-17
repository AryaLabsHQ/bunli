import { z } from 'zod'
import path from 'node:path'
import { existsSync } from 'node:fs'

// Bunli configuration schema
export const bunliConfigSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  
  commands: z.object({
    manifest: z.string().optional(),
    directory: z.string().optional()
  }).optional(),
  
  build: z.object({
    entry: z.string().or(z.array(z.string())).optional(),
    outdir: z.string().optional(),
    targets: z.array(z.string()).optional(),
    compress: z.boolean().optional(),
    external: z.array(z.string()).optional(),
    minify: z.boolean().optional(),
    sourcemap: z.boolean().optional()
  }).optional(),
  
  dev: z.object({
    watch: z.boolean().optional(),
    inspect: z.boolean().optional(),
    port: z.number().optional()
  }).optional(),
  
  test: z.object({
    pattern: z.string().or(z.array(z.string())).optional(),
    coverage: z.boolean().optional(),
    watch: z.boolean().optional()
  }).optional(),
  
  release: z.object({
    npm: z.boolean().optional(),
    github: z.boolean().optional(),
    tagFormat: z.string().optional(),
    conventionalCommits: z.boolean().optional()
  }).optional(),
  
  workspace: z.object({
    packages: z.array(z.string()).optional(),
    shared: z.any().optional(),
    versionStrategy: z.enum(['fixed', 'independent']).optional()
  }).optional()
})

export type BunliConfig = z.infer<typeof bunliConfigSchema>

// Config file names to search for
const CONFIG_NAMES = [
  'bunli.config.ts',
  'bunli.config.js',
  'bunli.config.mjs'
]

export async function loadConfig(cwd = process.cwd()): Promise<BunliConfig> {
  // Look for config file
  for (const configName of CONFIG_NAMES) {
    const configPath = path.join(cwd, configName)
    if (existsSync(configPath)) {
      try {
        const module = await import(configPath)
        const config = module.default || module
        return bunliConfigSchema.parse(config)
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error)
        throw error
      }
    }
  }
  
  // Return default config if no file found
  return {}
}

export function defineConfig(config: BunliConfig): BunliConfig {
  return config
}