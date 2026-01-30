import type { BuildOutput, BunPlugin, OnLoadArgs, OnResolveArgs } from 'bun'
import { Generator } from './generator.js'
import type { GeneratorConfig } from './types.js'
import type { Build } from 'bun'
import { createLogger } from '@bunli/core/utils'

const logger = createLogger('generator:plugin')

export interface BunliCodegenPluginOptions {
  commandsDir?: string
  outputFile?: string
  config?: any
  generateReport?: boolean
}

/**
 * Bun plugin for automatic command type generation
 * 
 * This plugin integrates with Bun.build() to automatically generate
 * command types during the build process, eliminating the need for
 * separate codegen steps.
 */
export function bunliCodegenPlugin(options: BunliCodegenPluginOptions = {}): BunPlugin {
  const {
    commandsDir = 'commands',
    outputFile = './commands.gen.ts',
    config,
    generateReport
  } = options

  let generator: Generator | null = null

  return {
    name: 'bunli-codegen',
    
    setup(build) {
      // Initialize generator
      generator = new Generator({
        commandsDir,
        outputFile,
        config,
        generateReport
      })

      // Hook into the build start to generate types
      build.onStart(async () => {
        if (generator) {
          try {
            logger.debug('Generating command types...')
            await generator.run()
            logger.debug('Command types generated')
          } catch (error) {
            logger.debug('Failed to generate command types: %s', error instanceof Error ? error.message : String(error))
          }
        }
      })

      // Hook into file resolution to watch command files
      build.onResolve({ filter: /^\.\/commands\// }, async (args: OnResolveArgs) => {
        // This ensures command files are tracked by the bundler
        return {
          path: args.path,
          namespace: 'file'
        }
      })

      // Hook into load to process command files
      build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/, namespace: 'file' }, async (args: OnLoadArgs) => {
        // Check if this is a command file
        if (args.path.includes(commandsDir)) {
          // Let Bun handle the file normally, but we've already generated types
          return undefined
        }
        return undefined
      })

      // Hook into end to ensure types are up to date
      build.onEnd(async (result: BuildOutput) => {
        if (result.success && generator) {
          // Regenerate types if build was successful
          try {
            await generator.run()
          } catch (error) {
            logger.debug('Failed to regenerate types: %s', error instanceof Error ? error.message : String(error))
          }
        }
      })
    }
  }
}

/**
 * Create a Bun plugin that automatically generates command types
 * 
 * @param options Configuration options for the codegen plugin
 * @returns Bun plugin that can be used with Bun.build()
 * 
 * @example
 * ```typescript
 * import { bunliCodegenPlugin } from '@bunli/generator/plugin'
 * 
 * await Bun.build({
 *   entrypoints: ['./cli.ts'],
 *   outdir: './dist',
 *   plugins: [
 *     bunliCodegenPlugin({
 *       commandsDir: './commands',
 *       outputFile: './commands.gen.ts'
 *     })
 *   ]
 * })
 * ```
 */
export default bunliCodegenPlugin