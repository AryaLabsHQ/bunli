import { z } from 'zod'
import type { PluginConfig } from './plugin/types.js'

/**
 * Comprehensive Bunli configuration schema
 * Codegen and TypeScript are REQUIRED for all Bunli projects
 */
export const bunliConfigSchema = z.object({
  // Base configuration (required for CLI creation, optional for partial configs)
  name: z.string().min(1, 'Name is required').optional(),
  version: z.string().min(1, 'Version is required').optional(),
  description: z.string().optional(),
    
  // Commands configuration
  commands: z.object({
    manifest: z.string().optional(),
    directory: z.string().optional(),
    generateReport: z.boolean().optional()
  }).optional(),
  
  // Build configuration - TypeScript REQUIRED
  build: z.object({
    entry: z.string().or(z.array(z.string())).optional(),
    outdir: z.string().optional(),
    targets: z.array(z.string()).default(['native']),  // Sensible default
    compress: z.boolean().default(false),
    minify: z.boolean().default(false),
    external: z.array(z.string()).optional(),
    sourcemap: z.boolean().default(true)  // Always include sourcemaps for debugging
  }).default({
    targets: ['native'],
    compress: false,
    minify: false,
    sourcemap: true
  }),

  // Development configuration
  dev: z.object({
    watch: z.boolean().default(true),  // Always watch by default
    inspect: z.boolean().default(false),
    port: z.number().optional()
  }).default({
    watch: true,
    inspect: false
  }),

  // Test configuration
  test: z.object({
    pattern: z.string().or(z.array(z.string())).default(['**/*.test.ts', '**/*.spec.ts']),
    coverage: z.boolean().default(false),
    watch: z.boolean().default(false)
  }).default({
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: false,
    watch: false
  }),

  // Workspace configuration
  workspace: z.object({
    packages: z.array(z.string()).optional(),
    shared: z.any().optional(),
    versionStrategy: z.enum(['fixed', 'independent']).default('fixed')
  }).default({
    versionStrategy: 'fixed' as const
  }),

  // Release configuration
  release: z.object({
    npm: z.boolean().default(true),
    github: z.boolean().default(false),
    tagFormat: z.string().default('v{{version}}'),
    conventionalCommits: z.boolean().default(true)
  }).default({
    npm: true,
    github: false,
    tagFormat: 'v{{version}}',
    conventionalCommits: true
  }),
  
  // Plugins configuration
  plugins: z.array(z.any()).default([])
})

/**
 * Inferred TypeScript type from the schema
 * This ensures runtime validation matches compile-time types
 */
export type BunliConfig = z.infer<typeof bunliConfigSchema>

/**
 * Strict schema for CLI creation that requires name and version
 * Codegen and TypeScript are automatically enabled
 */
export const bunliConfigStrictSchema = bunliConfigSchema.extend({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required')
})

export type BunliConfigStrict = z.infer<typeof bunliConfigStrictSchema>

/**
 * Helper function to define configuration with type safety
 * Codegen and TypeScript are automatically configured
 */
export function defineConfig(config: BunliConfig): BunliConfig {
  return config
}
