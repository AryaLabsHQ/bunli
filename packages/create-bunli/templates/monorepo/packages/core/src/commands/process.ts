import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { logger } from '@{{projectName}}/utils'
import type { ProcessOptions } from '../types.js'

export const processCommand = defineCommand({
  name: 'process',
  description: 'Process input files',
  args: z.array(z.string()).min(1).describe('Files to process'),
  options: {
    output: option(
      z.string().optional(),
      {
        short: 'o',
        description: 'Output directory'
      }
    ),
    format: option(
      z.enum(['json', 'yaml', 'text']).default('json'),
      {
        short: 'f',
        description: 'Output format'
      }
    ),
    verbose: option(
      z.boolean().default(false),
      {
        short: 'v',
        description: 'Verbose output'
      }
    )
  },
  handler: async ({ args, flags, spinner }) => {
    const spin = spinner('Processing files...')
    spin.start()
    
    try {
      for (const file of args) {
        if (flags.verbose) {
          logger.info(`Processing ${file}`)
        }
        
        // Process logic here
        await processFile(file, {
          input: file,
          output: flags.output,
          format: flags.format,
          verbose: flags.verbose
        })
      }
      
      spin.succeed(`Processed ${args.length} files`)
    } catch (error) {
      spin.fail('Processing failed')
      logger.error(error)
      process.exit(1)
    }
  }
})

async function processFile(file: string, options: ProcessOptions): Promise<void> {
  // Implementation here
  logger.debug(`Processing ${file} with options:`, options)
}