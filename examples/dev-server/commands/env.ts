import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

const envCommand = defineCommand({
  name: 'env',
  description: 'Manage environment variables',
  options: {
    set: option(
      z.string().optional(),
      { 
        description: 'Set environment variable (format: KEY=VALUE)',
        short: 's'
      }
    ),
    get: option(
      z.string().optional(),
      { 
        description: 'Get environment variable value',
        short: 'g'
      }
    ),
    list: option(
      z.boolean().default(false),
      { 
        description: 'List all environment variables',
        short: 'l'
      }
    ),
    file: option(
      z.string().default('.env'),
      { 
        description: 'Environment file to use',
        short: 'f'
      }
    )
  },
  handler: async ({ flags, spinner, colors, context }) => {
    const { set, get, list, file } = flags
    
    if (set) {
      const [key, ...valueParts] = set.split('=')
      const value = valueParts.join('=')
      
      if (!key || !value) {
        console.error(colors.red('Error: Invalid format. Use KEY=VALUE'))
        process.exit(1)
      }
      
      const setSpinner = spinner(`Setting ${key}...`)
      await new Promise(resolve => setTimeout(resolve, 300))
      setSpinner.succeed(`Set ${colors.cyan(key)}=${colors.green(value)}`)
      
      // In a real implementation, you'd write to the env file
      console.log(colors.dim(`Would write to ${file}`))
      
    } else if (get) {
      const getSpinner = spinner(`Getting ${get}...`)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const value = process.env[get]
      if (value) {
        getSpinner.succeed(`${colors.cyan(get)}=${colors.green(value)}`)
      } else {
        getSpinner.fail(`${colors.red(get)} not found`)
      }
      
    } else if (list) {
      const listSpinner = spinner('Loading environment variables...')
      await new Promise(resolve => setTimeout(resolve, 400))
      listSpinner.succeed('Environment variables loaded')
      
      const envVars = Object.keys(process.env)
        .filter(key => key.startsWith('DEV_') || key.startsWith('NODE_'))
        .sort()
      
      if (envVars.length === 0) {
        console.log(colors.yellow('No environment variables found'))
        return
      }
      
      console.log(colors.cyan('\nEnvironment Variables:'))
      envVars.forEach(key => {
        const value = process.env[key]
        console.log(`  ${colors.cyan(key)}=${colors.green(value || 'undefined')}`)
      })
      
    } else {
      console.log(colors.yellow('No action specified. Use --set, --get, or --list'))
      console.log(colors.dim('\nExamples:'))
      console.log(colors.dim('  dev-server env --set API_KEY=abc123'))
      console.log(colors.dim('  dev-server env --get API_KEY'))
      console.log(colors.dim('  dev-server env --list'))
    }
    
    // Access plugin context
    if (context?.store && 'metrics' in context.store) {
      context.store.metrics.recordEvent('env_command', { action: set ? 'set' : get ? 'get' : 'list' })
    }
  }
})

export default envCommand
