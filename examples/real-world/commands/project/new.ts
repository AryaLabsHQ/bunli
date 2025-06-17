import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'new',
  description: 'Create a new project from template',
  alias: 'n',
  options: {
    name: z.string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens')
      .describe('Project name'),
    
    template: option(
      z.enum(['node', 'react', 'vue', 'api', 'cli']).default('node'),
      { short: 't', description: 'Project template' }
    ),
    
    dir: option(
      z.string().optional(),
      { short: 'd', description: 'Directory to create project in' }
    ),
    
    install: option(
      z.coerce.boolean().default(true),
      { short: 'i', description: 'Install dependencies' }
    ),
    
    git: option(
      z.coerce.boolean().default(true),
      { short: 'g', description: 'Initialize git repository' }
    ),
    
    open: option(
      z.coerce.boolean().default(false),
      { short: 'o', description: 'Open in editor after creation' }
    )
  },
  
  handler: async ({ flags, shell, colors, spinner, prompt }) => {
    const projectDir = flags.dir || flags.name
    
    // Check if directory exists
    try {
      await shell`test -d ${projectDir}`.quiet()
      const overwrite = await prompt.confirm(
        `Directory ${projectDir} already exists. Overwrite?`,
        { default: false }
      )
      if (!overwrite) {
        console.log(colors.red('Cancelled'))
        return
      }
    } catch {
      // Directory doesn't exist, which is good
    }
    
    const spin = spinner(`Creating ${flags.template} project...`)
    spin.start()
    
    // Create project structure
    spin.update('Creating project structure...')
    await shell`mkdir -p ${projectDir}`
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Copy template files (simulated)
    spin.update('Copying template files...')
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Update package.json with project name
    spin.update('Configuring project...')
    await new Promise(resolve => setTimeout(resolve, 600))
    
    if (flags.git) {
      spin.update('Initializing git repository...')
      await shell`cd ${projectDir} && git init`.quiet()
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    
    if (flags.install) {
      spin.update('Installing dependencies...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    spin.succeed(`Project ${colors.cyan(flags.name)} created successfully!`)
    
    console.log(`\nNext steps:`)
    console.log(`  ${colors.gray('cd')} ${projectDir}`)
    if (!flags.install) {
      console.log(`  ${colors.gray('bun install')}`)
    }
    console.log(`  ${colors.gray('bun dev')}`)
    
    if (flags.open) {
      console.log(colors.dim('\nOpening in editor...'))
      await shell`code ${projectDir}`.quiet()
    }
  }
})