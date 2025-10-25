import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '../utils/config.js'
import { validateFiles } from '../utils/validator.js'
import { glob } from '../utils/glob.js'

const validateCommand = defineCommand({
  name: 'validate',
  description: 'Validate files against defined rules',
  args: z.array(z.string()).min(1).describe('Files to validate'),
  options: {
    config: option(
      z.string().optional(),
      {
        short: 'c',
        description: 'Path to config file'
      }
    ),
    fix: option(
      z.boolean().default(false),
      {
        short: 'f',
        description: 'Auto-fix issues'
      }
    ),
    cache: option(
      z.boolean().default(true),
      {
        description: 'Enable caching'
      }
    )
  },
  handler: async ({ args, flags, colors, spinner }) => {
    const spin = spinner('Loading configuration...')
    spin.start()
    
    try {
      // Load config
      const config = await loadConfig(flags.config)
      spin.succeed('Configuration loaded')
      
      // Resolve files
      const fileSpin = spinner('Resolving files...')
      fileSpin.start()
      
      const files = await glob(args, {
        include: config.include,
        exclude: config.exclude
      })
      
      fileSpin.succeed(`Found ${files.length} files to validate`)
      
      if (files.length === 0) {
        console.log(colors.yellow('No files matched the pattern'))
        return
      }
      
      // Run validation
      const validateSpin = spinner('Validating files...')
      validateSpin.start()
      
      const results = await validateFiles(files, {
        rules: config.rules,
        fix: flags.fix,
        cache: flags.cache && config.cache?.enabled
      })
      
      validateSpin.stop()
      
      // Display results
      let hasErrors = false
      
      for (const result of results) {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          console.log()
          console.log(colors.bold(result.file))
          
          for (const error of result.errors) {
            console.log(colors.red(`  ✗ ${error.line}:${error.column} ${error.message}`))
            hasErrors = true
          }
          
          for (const warning of result.warnings) {
            console.log(colors.yellow(`  ⚠ ${warning.line}:${warning.column} ${warning.message}`))
          }
        }
      }
      
      // Summary
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)
      
      console.log()
      if (totalErrors === 0 && totalWarnings === 0) {
        console.log(colors.green('✅ All files passed validation!'))
      } else {
        console.log(colors.bold('Summary:'))
        if (totalErrors > 0) {
          console.log(colors.red(`  ${totalErrors} error${totalErrors !== 1 ? 's' : ''}`))
        }
        if (totalWarnings > 0) {
          console.log(colors.yellow(`  ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`))
        }
        
        if (hasErrors) {
          process.exit(1)
        }
      }
      
    } catch (error) {
      spin.fail('Validation failed')
      console.error(colors.red(String(error)))
      process.exit(1)
    }
  }
})

export default validateCommand