import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Demonstrates data transformation with schemas
export default defineCommand({
  name: 'transform',
  description: 'Data transformation examples',
  options: {
    // Parse JSON
    config: option(
      z.string()
        .transform((val) => {
          try {
            return JSON.parse(val)
          } catch {
            throw new Error('Invalid JSON')
          }
        })
        .pipe(z.object({
          name: z.string(),
          port: z.number().optional(),
          enabled: z.boolean().optional()
        })),
      { short: 'c', description: 'JSON configuration' }
    ),
    
    // Transform to uppercase
    env: option(
      z.string()
        .transform(val => val.toUpperCase())
        .pipe(z.enum(['DEV', 'STAGING', 'PROD'])),
      { short: 'e', description: 'Environment (will be uppercased)' }
    ),
    
    // Parse size with units
    memory: option(
      z.string()
        .regex(/^\d+[kmg]b?$/i, 'Format: 512k, 1g, 2GB')
        .transform((val) => {
          const match = val.match(/^(\d+)([kmg])b?$/i)
          if (!match) throw new Error('Invalid format')
          
          const [, num, unit] = match
          const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 }
          return parseInt(num) * multipliers[unit.toLowerCase() as 'k' | 'm' | 'g']
        }),
      { short: 'm', description: 'Memory limit (e.g., 512k, 1g)' }
    ),
    
    // Parse key-value pairs
    vars: option(
      z.string()
        .transform(val => {
          const pairs = val.split(',').map(p => p.trim())
          const result: Record<string, string> = {}
          
          for (const pair of pairs) {
            const [key, value] = pair.split('=')
            if (!key || !value) {
              throw new Error(`Invalid key-value pair: ${pair}`)
            }
            result[key] = value
          }
          
          return result
        })
        .optional(),
      { short: 'v', description: 'Variables (key=value,key2=value2)' }
    )
  },
  
  handler: async ({ flags, colors }) => {
    console.log(colors.bold('Transformed Data:'))
    console.log(colors.dim('━'.repeat(50)))
    
    console.log(colors.cyan('Config:'))
    console.log(JSON.stringify(flags.config, null, 2))
    
    console.log(`\nEnvironment: ${colors.yellow(flags.env)}`)
    console.log(`Memory: ${colors.green(formatBytes(flags.memory))}`)
    
    if (flags.vars) {
      console.log(colors.cyan('\nVariables:'))
      for (const [key, value] of Object.entries(flags.vars)) {
        console.log(`  ${key} = ${colors.magenta(value)}`)
      }
    }
    
    console.log(colors.dim('━'.repeat(50)))
  }
})

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} bytes`
}