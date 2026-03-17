import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { logger } from '@{{name}}/utils'
import type { ProcessOptions } from '../types.js'

const processCommand = defineCommand({
  name: 'process',
  description: 'Process input files',
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
  handler: async ({ positional, flags, spinner }) => {
    const files = positional
    if (files.length === 0) {
      logger.error('Usage: process <file...>')
      process.exit(1)
    }

    const spin = spinner('Processing files...')
    spin.start()
    
    try {
      for (const file of files) {
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
      
      spin.succeed(`Processed ${files.length} files`)
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

export default processCommand
