import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'migrate',
  description: 'Run database migrations',
  alias: 'm',
  options: {
    direction: option(
      z.enum(['up', 'down']).default('up'),
      { short: 'd', description: 'Migration direction' }
    ),
    
    steps: option(
      z.coerce.number().int().positive().default(1),
      { short: 's', description: 'Number of migrations to run' }
    ),
    
    env: option(
      z.string().default(process.env.NODE_ENV || 'development'),
      { description: 'Environment' }
    )
  },
  
  handler: async ({ flags, colors, spinner }) => {
    const spin = spinner(`Running ${flags.steps} migration(s) ${flags.direction}...`)
    spin.start()
    
    // Simulate migrations
    for (let i = 1; i <= flags.steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      spin.update(`Migration ${i}/${flags.steps}...`)
    }
    
    spin.succeed(`Ran ${flags.steps} migration(s) ${flags.direction}`)
    console.log(`Environment: ${colors.cyan(flags.env)}`)
  }
})