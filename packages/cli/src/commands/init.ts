import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { spawn } from 'node:child_process'

export default defineCommand({
  name: 'init',
  description: 'Initialize a new Bunli CLI project',
  alias: 'i',
  options: {
    name: option(
      z.string().optional(),
      { short: 'n', description: 'Project name' }
    ),
    template: option(
      z.enum(['basic', 'advanced', 'monorepo']).default('basic'),
      { short: 't', description: 'Project template' }
    ),
    dir: option(
      z.string().optional(),
      { short: 'd', description: 'Directory to create project in' }
    ),
    git: option(
      z.boolean().default(true),
      { short: 'g', description: 'Initialize git repository' }
    ),
    install: option(
      z.boolean().default(true),
      { description: 'Install dependencies' }
    ),
    'package-manager': option(
      z.enum(['bun', 'pnpm', 'yarn', 'npm']).default('bun'),
      { short: 'p', description: 'Package manager to use' }
    )
  },
  handler: async ({ flags, positional, colors }) => {
    console.log(colors.cyan('🚀 Creating new Bunli CLI project...'))
    console.log()
    
    // Build create-bunli command
    const args = ['create-bunli']
    
    // Add project name from positional arg
    if (positional[0]) {
      args.push(positional[0])
    } else if (flags.name) {
      args.push(flags.name)
    }
    
    // Add flags
    if (flags.template !== 'basic') {
      args.push('--template', flags.template)
    }
    
    if (flags.dir) {
      args.push('--dir', flags.dir)
    }
    
    if (!flags.git) {
      args.push('--no-git')
    }
    
    if (!flags.install) {
      args.push('--no-install')
    }
    
    if (flags['package-manager'] !== 'bun') {
      args.push('--package-manager', flags['package-manager'])
    }
    
    console.log(colors.dim(`> bunx ${args.join(' ')}`))
    console.log()
    
    // Run create-bunli via bunx
    const proc = spawn('bunx', args, {
      stdio: 'inherit',
      env: process.env
    })
    
    proc.on('exit', (code) => {
      if (code === 0) {
        console.log()
        console.log(colors.green('🎉 Project created successfully!'))
        console.log()
        console.log('Next steps:')
        const projectName = positional[0] || flags.name || 'your-project'
        console.log(colors.gray(`  cd ${projectName}`))
        console.log(colors.gray('  bunli dev'))
      } else {
        console.error(colors.red('Failed to create project'))
        process.exit(code || 1)
      }
    })
    
    proc.on('error', (error) => {
      console.error(colors.red('Failed to run create-bunli:'), error.message)
      console.log()
      console.log('Make sure create-bunli is available:')
      console.log(colors.gray('  bunx create-bunli --help'))
      process.exit(1)
    })
  }
})