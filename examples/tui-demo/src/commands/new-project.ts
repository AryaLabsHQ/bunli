import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export const newProjectCommand = defineCommand({
  name: 'new',
  description: 'Create a new project with interactive setup',
  options: {
    name: option(
      z.string().min(1).describe('Project name'),
      { description: 'Name of the project', short: 'n' }
    ),
    type: option(
      z.enum(['library', 'application', 'monorepo']).default('application'),
      { description: 'Type of project', short: 't' }
    ),
    framework: option(
      z.enum(['bun', 'node', 'deno']).default('bun'),
      { description: 'Runtime framework', short: 'f' }
    ),
    typescript: option(
      z.boolean().default(true),
      { description: 'Use TypeScript', short: 'ts' }
    ),
    git: option(
      z.boolean().default(true),
      { description: 'Initialize git repository', short: 'g' }
    ),
    installDeps: option(
      z.boolean().default(true),
      { description: 'Install dependencies', short: 'i' }
    ),
    author: option(
      z.string().optional(),
      { description: 'Author name' }
    ),
    license: option(
      z.enum(['MIT', 'Apache-2.0', 'GPL-3.0', 'ISC', 'BSD-3-Clause', 'Unlicense']).default('MIT'),
      { description: 'License type' }
    )
  },
  handler: async ({ flags, terminal, colors, spinner }) => {
    
    console.log(colors.green('Creating new project...'))
    console.log()
    console.log('Project configuration:')
    console.log(`  ${colors.dim('Name:')} ${colors.bold(flags.name)}`)
    console.log(`  ${colors.dim('Type:')} ${flags.type}`)
    console.log(`  ${colors.dim('Framework:')} ${flags.framework}`)
    console.log(`  ${colors.dim('TypeScript:')} ${flags.typescript ? 'Yes' : 'No'}`)
    console.log(`  ${colors.dim('Git:')} ${flags.git ? 'Yes' : 'No'}`)
    console.log(`  ${colors.dim('License:')} ${flags.license}`)
    if (flags.author) {
      console.log(`  ${colors.dim('Author:')} ${flags.author}`)
    }
    console.log()
    
    const createSpinner = spinner('Creating project structure...')
    
    // Simulate project creation
    await new Promise(resolve => setTimeout(resolve, 1500))
    createSpinner.succeed('Project structure created')
    
    if (flags.git) {
      const gitSpinner = spinner('Initializing git repository...')
      await new Promise(resolve => setTimeout(resolve, 800))
      gitSpinner.succeed('Git repository initialized')
    }
    
    if (flags.installDeps) {
      const depsSpinner = spinner('Installing dependencies...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      depsSpinner.succeed('Dependencies installed')
    }
    
    console.log()
    console.log(colors.green('✓ Project created successfully!'))
    console.log()
    console.log('Next steps:')
    console.log(`  ${colors.cyan('cd')} ${flags.name}`)
    console.log(`  ${colors.cyan('bun run dev')}`)
    
    if (terminal.isInteractive) {
      console.log()
      console.log(colors.dim('Terminal capabilities detected:'))
      console.log(`  ${colors.dim('Size:')} ${terminal.width}x${terminal.height}`)
      console.log(`  ${colors.dim('Color support:')} ${terminal.supportsColor ? 'Yes' : 'No'}`)
      console.log(`  ${colors.dim('Mouse support:')} ${terminal.supportsMouse ? 'Yes' : 'No'}`)
    }
  }
})