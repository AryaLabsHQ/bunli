import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'init',
  description: 'Initialize a new project',
  alias: 'i', // Single alias
  options: {
    name: option(
      z.string()
        .min(1, 'Project name is required')
        .regex(/^[a-z0-9-]+$/, 'Name must be lowercase with hyphens only'),
      { short: 'n', description: 'Project name' }
    ),
    
    template: option(
      z.enum(['basic', 'full', 'minimal']).default('basic'),
      { short: 't', description: 'Project template' }
    ),
    
    git: option(
      z.coerce.boolean().default(true),
      { description: 'Initialize git repository' }
    )
  },
  
  handler: async ({ flags, colors, spinner }) => {
    const spin = spinner(`Creating project ${colors.cyan(flags.name)}...`)
    spin.start()
    
    // Simulate project creation
    await new Promise(resolve => setTimeout(resolve, 1000))
    spin.update('Setting up template...')
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (flags.git) {
      spin.update('Initializing git repository...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    spin.succeed(`Project ${colors.cyan(flags.name)} created successfully!`)
    
    console.log(`\nNext steps:`)
    console.log(`  ${colors.gray('cd')} ${flags.name}`)
    console.log(`  ${colors.gray('bun install')}`)
    console.log(`  ${colors.gray('bun dev')}`)
  }
})