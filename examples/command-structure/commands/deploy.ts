import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy',
  description: 'Deploy the application',
  alias: ['d', 'ship'], // Multiple aliases
  options: {
    environment: option(
      z.enum(['dev', 'staging', 'prod']),
      { short: 'e', description: 'Target environment' }
    ),
    
    branch: option(
      z.string().default('main'),
      { short: 'b', description: 'Git branch to deploy' }
    ),
    
    force: option(
      z.coerce.boolean().default(false),
      { short: 'f', description: 'Skip confirmation prompts' }
    )
  },
  
  handler: async ({ flags, colors, prompt }) => {
    console.log(colors.bold('Deployment Configuration:'))
    console.log(`Environment: ${colors.cyan(flags.environment)}`)
    console.log(`Branch: ${colors.yellow(flags.branch)}`)
    
    if (!flags.force && flags.environment === 'prod') {
      const confirmed = await prompt.confirm(
        'Deploy to production?',
        { default: false }
      )
      
      if (!confirmed) {
        console.log(colors.red('Deployment cancelled'))
        return
      }
    }
    
    console.log(colors.green('\n✓ Deployment initiated'))
  }
})