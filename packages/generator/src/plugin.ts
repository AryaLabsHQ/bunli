import type { BuildOutput, BunPlugin } from 'bun'
import { Generator } from './generator.js'
import type { GeneratorConfig } from './types.js'
import type { Build } from 'bun'
import { createLogger } from '@bunli/core/utils'
import { Result } from 'better-result'

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
          logger.debug('Generating command types...')
          const generation = await generator.run()
          if (Result.isError(generation)) {
            logger.warn(
              'Failed to generate command types: %s',
              generation.error.message
            )
            return
          }
          logger.debug('Command types generated')
        }
      })

      // Hook into end to ensure types are up to date
      build.onEnd(async (result: BuildOutput) => {
        if (result.success && generator) {
          // Regenerate types if build was successful
          const regeneration = await generator.run()
          if (Result.isError(regeneration)) {
            logger.warn('Failed to regenerate types: %s', regeneration.error.message)
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
