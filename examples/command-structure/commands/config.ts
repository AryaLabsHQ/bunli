import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Command with subcommands (no handler)
export default defineCommand({
  name: 'config',
  description: 'Manage configuration',
  commands: [
    // Inline subcommand
    defineCommand({
      name: 'get',
      description: 'Get a config value',
      options: {
        key: option(z.string(), { description: 'Config key' })
      },
      handler: async ({ flags, colors }) => {
        // Simulate config lookup
        const mockConfig: Record<string, string> = {
          'api.url': 'https://api.example.com',
          'api.key': '***hidden***',
          'debug': 'false'
        }
        
        const value = mockConfig[flags.key]
        if (value) {
          console.log(`${colors.cyan(flags.key)} = ${colors.yellow(value)}`)
        } else {
          console.log(colors.red(`Config key '${flags.key}' not found`))
        }
      }
    }),
    
    // Another inline subcommand
    defineCommand({
      name: 'set',
      description: 'Set a config value',
      options: {
        key: option(z.string(), { description: 'Config key' }),
        value: option(z.string(), { description: 'Config value' })
      },
      handler: async ({ flags, colors }) => {
        console.log(`${colors.green('✓')} Set ${colors.cyan(flags.key)} = ${colors.yellow(flags.value)}`)
      }
    }),
    
    defineCommand({
      name: 'list',
      description: 'List all config values',
      alias: 'ls',
      handler: async ({ colors }) => {
        console.log(colors.bold('Configuration:'))
        console.log(`${colors.cyan('api.url')} = ${colors.yellow('https://api.example.com')}`)
        console.log(`${colors.cyan('api.key')} = ${colors.gray('***hidden***')}`)
        console.log(`${colors.cyan('debug')} = ${colors.yellow('false')}`)
      }
    })
  ]
})