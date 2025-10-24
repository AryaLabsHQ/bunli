import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'build' as const,
  description: 'Build project with validation and transformation',
  options: {
    // Environment with validation
    env: option(
      z.enum(['development', 'staging', 'production'])
        .default('development'),
      { 
        short: 'e', 
        description: 'Build environment' 
      }
    ),
    
    // Output directory with validation
    outdir: option(
      z.string()
        .min(1, 'Output directory cannot be empty')
        .default('dist'),
      { 
        short: 'o', 
        description: 'Output directory' 
      }
    ),
    
    // Configuration file with JSON parsing
    config: option(
      z.string()
        .transform((val) => {
          try {
            return JSON.parse(val)
          } catch {
            throw new Error('Invalid JSON configuration')
          }
        })
        .optional(),
      { 
        short: 'c', 
        description: 'JSON configuration object' 
      }
    ),
    
    // Memory limit with size parsing
    memory: option(
      z.string()
        .regex(/^\d+[kmg]?$/i, 'Memory must be a number with optional unit (k, m, g)')
        .transform((val) => {
          const num = parseInt(val)
          const unit = val.slice(-1).toLowerCase()
          const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 }
          return num * (multipliers[unit as keyof typeof multipliers] || 1)
        })
        .default('512m'),
      { 
        short: 'm', 
        description: 'Memory limit (e.g., 512m, 2g)' 
      }
    ),
    
    // Variables with key=value parsing
    variables: option(
      z.string()
        .transform((val) => {
          const vars: Record<string, string> = {}
          val.split(',').forEach(pair => {
            const [key, value] = pair.split('=')
            if (key && value) {
              vars[key.trim()] = value.trim()
            }
          })
          return vars
        })
        .optional(),
      { 
        short: 'v', 
        description: 'Environment variables (key1=value1,key2=value2)' 
      }
    ),
    
    // Watch mode
    watch: option(
      z.coerce.boolean().default(false),
      { 
        short: 'w', 
        description: 'Watch for changes' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner }) => {
    const spin = spinner('Building project...')
    
    try {
      // Simulate build process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      spin.update('Validating configuration...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (flags.config) {
        spin.update('Applying custom configuration...')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      spin.update('Compiling assets...')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      spin.succeed(`Build completed successfully!`)
      
      console.log(colors.bold('\nBuild Summary:'))
      console.log(`  Environment: ${colors.cyan(flags.env)}`)
      console.log(`  Output: ${colors.cyan(flags.outdir)}`)
      console.log(`  Memory: ${colors.cyan(flags.memory.toString())} bytes`)
      
      if (flags.config) {
        console.log(`  Config: ${colors.cyan(JSON.stringify(flags.config, null, 2))}`)
      }
      
      if (flags.variables) {
        console.log(`  Variables: ${colors.cyan(Object.keys(flags.variables).length.toString())} set`)
      }
      
      if (flags.watch) {
        console.log(colors.yellow('\n👀 Watching for changes...'))
      }
      
    } catch (error) {
      spin.fail('Build failed')
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  }
})
