import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Complex schema with nested validation to demonstrate error handling
const configSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string().ip({ message: 'Must be a valid IP address' })
  }),
  database: z.object({
    url: z.string().url({ message: 'Must be a valid database URL' }),
    maxConnections: z.number().int().positive()
  })
})

export default defineCommand({
  name: 'errors',
  description: 'Demonstrates enhanced error handling with @standard-schema/utils',
  options: {
    config: option(
      z.string().transform((val) => {
        try {
          return JSON.parse(val)
        } catch {
          throw new Error('Invalid JSON format')
        }
      }).pipe(configSchema),
      { 
        short: 'c', 
        description: 'Configuration in JSON format' 
      }
    ),
    port: option(
      z.coerce.number()
        .int({ message: 'Port must be a whole number' })
        .min(1, { message: 'Port must be at least 1' })
        .max(65535, { message: 'Port cannot exceed 65535' }),
      { 
        short: 'p', 
        description: 'Server port (1-65535)' 
      }
    ),
    email: option(
      z.string().email({ message: 'Please provide a valid email address' }),
      { 
        short: 'e', 
        description: 'Admin email address' 
      }
    ),
    tags: option(
      z.string()
        .transform(val => val.split(','))
        .pipe(
          z.array(z.string().min(1, { message: 'Tags cannot be empty' }))
            .min(1, { message: 'At least one tag is required' })
            .max(5, { message: 'Maximum 5 tags allowed' })
        ),
      { 
        short: 't', 
        description: 'Comma-separated tags (1-5 tags)' 
      }
    )
  },
  handler: async ({ flags, colors }) => {
    console.log(colors.green('✅ All validations passed!'))
    console.log()
    console.log(colors.bold('Received configuration:'))
    
    if (flags.config) {
      console.log(colors.dim('Config:'))
      console.log(JSON.stringify(flags.config, null, 2))
    }
    
    if (flags.port) {
      console.log(colors.dim('Port:'), flags.port)
    }
    
    if (flags.email) {
      console.log(colors.dim('Email:'), flags.email)
    }
    
    if (flags.tags) {
      console.log(colors.dim('Tags:'), flags.tags.join(', '))
    }
  }
})