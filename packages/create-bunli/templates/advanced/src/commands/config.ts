import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig, saveConfig, getConfigPath } from '../utils/config.js'

const configCommand = defineCommand({
  name: 'config',
  description: 'Manage configuration',
  subcommands: [
    defineCommand({
      name: 'get',
      description: 'Get a config value',
      args: z.tuple([z.string()]).describe('Config key to get'),
      handler: async ({ args, colors }) => {
        const [key] = args
        
        try {
          const config = await loadConfig()
          const value = getNestedValue(config, key)
          
          if (value === undefined) {
            console.log(colors.yellow(`Config key '${key}' not found`))
          } else {
            console.log(JSON.stringify(value, null, 2))
          }
        } catch (error) {
          console.error(colors.red(`Failed to load config: ${error}`))
          process.exit(1)
        }
      }
    }),
    
    defineCommand({
      name: 'set',
      description: 'Set a config value',
      args: z.tuple([z.string(), z.string()]).describe('Config key and value'),
      handler: async ({ args, colors, spinner }) => {
        const [key, value] = args
        
        const spin = spinner('Updating config...')
        spin.start()
        
        try {
          const config = await loadConfig()
          setNestedValue(config, key, JSON.parse(value))
          await saveConfig(config)
          
          spin.succeed(`Config '${key}' updated`)
        } catch (error) {
          spin.fail('Failed to update config')
          console.error(colors.red(String(error)))
          process.exit(1)
        }
      }
    }),
    
    defineCommand({
      name: 'list',
      description: 'List all config values',
      handler: async ({ colors }) => {
        try {
          const config = await loadConfig()
          const configPath = await getConfigPath()
          
          console.log(colors.bold('Configuration:'))
          console.log(colors.dim(`  File: ${configPath}`))
          console.log()
          console.log(JSON.stringify(config, null, 2))
        } catch (error) {
          console.error(colors.red(`Failed to load config: ${error}`))
          process.exit(1)
        }
      }
    }),
    
    defineCommand({
      name: 'reset',
      description: 'Reset config to defaults',
      options: {
        force: option(
          z.boolean().default(false),
          {
            short: 'f',
            description: 'Skip confirmation'
          }
        )
      },
      handler: async ({ flags, colors, prompt, spinner }) => {
        if (!flags.force) {
          const confirmed = await prompt.confirm(
            'This will reset all config to defaults. Continue?',
            { default: false }
          )
          
          if (!confirmed) {
            console.log(colors.yellow('Reset cancelled'))
            return
          }
        }
        
        const spin = spinner('Resetting config...')
        spin.start()
        
        try {
          const { DEFAULT_CONFIG } = await import('../utils/constants.js')
          await saveConfig(DEFAULT_CONFIG)
          
          spin.succeed('Config reset to defaults')
        } catch (error) {
          spin.fail('Failed to reset config')
          console.error(colors.red(String(error)))
          process.exit(1)
        }
      }
    })
  ]
})

function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  let current = obj
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[lastKey] = value
}

export default configCommand