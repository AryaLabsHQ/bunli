import { z } from 'zod'
import type { BunliPlugin, PluginConfig } from './plugin/types.js'

function isPluginObject(value: unknown): value is BunliPlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as { name?: unknown }).name === 'string'
  )
}

function isPluginConfig(value: unknown): value is PluginConfig {
  if (typeof value === 'string') return true
  if (typeof value === 'function') return true
  if (isPluginObject(value)) return true

  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'function'
  )
}

const pluginConfigSchema = z.custom<PluginConfig>(isPluginConfig, {
  message: 'Invalid plugin configuration'
})

const commandsConfigSchema = z
  .object({
    entry: z.string().optional(),
    directory: z.string().optional(),
    generateReport: z.boolean().optional()
  })
  .catchall(z.unknown())
  .superRefine((value, ctx) => {
    if (Object.prototype.hasOwnProperty.call(value, 'manifest')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "commands.manifest has been removed. Register commands explicitly with cli.command(...) and set commands.entry for tooling."
      })
    }
  })
  .transform((value) => ({
    entry: value.entry,
    directory: value.directory,
    generateReport: value.generateReport
  }))

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
  commands: commandsConfigSchema.optional(),
  
  // Build configuration - TypeScript REQUIRED
  build: z.object({
    entry: z.string().or(z.array(z.string())).optional(),
    outdir: z.string().optional(),
    targets: z.array(z.string()).default([]),
    compress: z.boolean().default(false),
    minify: z.boolean().default(false),
    external: z.array(z.string()).optional(),
    sourcemap: z.boolean().default(true)  // Always include sourcemaps for debugging
  }).default({
    targets: [],
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
    shared: z.unknown().optional(),
    versionStrategy: z.enum(['fixed', 'independent']).default('fixed')
  }).default({
    versionStrategy: 'fixed' as const
  }),

  // Release configuration
  release: z.object({
    npm: z.boolean().default(true),
    github: z.boolean().default(false),
    tagFormat: z.string().default('v{{version}}'),
    conventionalCommits: z.boolean().default(true),
    // Binary mode: publish per-platform packages using optionalDependencies pattern.
    // Platforms are derived from build.targets.
    binary: z.object({
      packageNameFormat: z.string().default('{{name}}-{{platform}}'),
      shimPath: z.string().default('bin/run.mjs'),
    }).optional()
  }).default({
    npm: true,
    github: false,
    tagFormat: 'v{{version}}',
    conventionalCommits: true
  }),
  
  // Plugins configuration
  plugins: z.array(pluginConfigSchema).default([]),

  // Help output configuration
  help: z.object({
    renderer: z.unknown().optional()
  }).optional(),

  // TUI configuration (applies to `command.render` path)
  tui: z.object({
    renderer: z.object({
      bufferMode: z.enum(['alternate', 'standard']).optional()
    }).catchall(z.unknown()).default({})
  }).default({
    renderer: {}
  })
})

/**
 * Inferred TypeScript type from the schema (output type with defaults applied)
 * This ensures runtime validation matches compile-time types
 */
export type BunliConfig = z.output<typeof bunliConfigSchema>

/**
 * Input type for config (fields with defaults are optional)
 */
export type BunliConfigInput = z.input<typeof bunliConfigSchema>

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
 * Parses and validates config, applying defaults
 */
export function defineConfig(config: BunliConfigInput): BunliConfig {
  return bunliConfigSchema.parse(config)
}
