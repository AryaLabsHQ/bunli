import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Interactive setup wizard
export default defineCommand({
  name: 'setup' as const,
  description: 'Interactive project setup wizard',
  options: {
    // Optional preset to skip some prompts
    preset: option(
      z.enum(['minimal', 'standard', 'full']).optional(),
      { short: 'p', description: 'Use a preset configuration' }
    )
  },
  
  handler: async ({ flags, prompt, colors, spinner }) => {
    console.log(colors.bold('Welcome to the Project Setup Wizard!\n'))
    
    // Project name
    const projectName = await prompt('What is your project name?', {
      validate: (val) => {
        if (!val || val.length < 3) return 'Project name must be at least 3 characters'
        if (!/^[a-z0-9-]+$/.test(val)) return 'Use lowercase letters, numbers, and hyphens only'
        return true
      }
    })
    
    // Project type (using select)
    const projectType = flags.preset ? 
      (flags.preset === 'minimal' ? 'library' : 'application') :
      await prompt.select('What type of project?', {
        options: [
          { value: 'application', label: 'Application', hint: 'Full application with UI' },
          { value: 'library', label: 'Library', hint: 'Reusable package' },
          { value: 'cli', label: 'CLI Tool', hint: 'Command-line application' }
        ]
      })
    
    // Features (multiple confirmations)
    const features = {
      typescript: flags.preset !== 'minimal' || 
        await prompt.confirm('Use TypeScript?', { default: true }),
      
      testing: flags.preset === 'full' ||
        (flags.preset !== 'minimal' && await prompt.confirm('Include testing?', { default: true })),
      
      linting: flags.preset === 'full' ||
        (flags.preset !== 'minimal' && await prompt.confirm('Setup linting?', { default: true }))
    }
    
    // Database (conditional)
    let database: string | null = null
    if (projectType === 'application' && flags.preset !== 'minimal') {
      database = await prompt.select('Choose a database:', {
        options: [
          { value: 'none', label: 'None' },
          { value: 'sqlite', label: 'SQLite', hint: 'Lightweight, file-based' },
          { value: 'postgres', label: 'PostgreSQL', hint: 'Full-featured, scalable' },
          { value: 'mysql', label: 'MySQL', hint: 'Popular, reliable' }
        ],
        default: 'none'
      })
      if (database === 'none') database = null
    }
    
    // Git configuration
    const gitConfig = {
      init: await prompt.confirm('Initialize git repository?', { default: true }),
      remote: null as string | null
    }
    
    if (gitConfig.init) {
      gitConfig.remote = await prompt('Git remote URL (optional):', {
        default: ''
      })
    }
    
    // Confirmation
    console.log(colors.bold('\nProject Configuration:'))
    console.log(colors.dim('━'.repeat(50)))
    console.log(`Name: ${colors.cyan(projectName)}`)
    console.log(`Type: ${colors.yellow(projectType)}`)
    console.log(`Features: ${Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => colors.green(name))
      .join(', ')
    }`)
    if (database) console.log(`Database: ${colors.blue(database)}`)
    if (gitConfig.init) console.log(`Git: ${colors.magenta('enabled')}`)
    console.log(colors.dim('━'.repeat(50)))
    
    const confirmed = await prompt.confirm('\nProceed with this configuration?', { default: true })
    
    if (!confirmed) {
      console.log(colors.red('Setup cancelled'))
      return
    }
    
    // Create project
    const spin = spinner('Creating project structure...')
    spin.start()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    spin.update('Installing dependencies...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (gitConfig.init) {
      spin.update('Initializing git repository...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    spin.succeed('Project created successfully!')
    
    console.log(`\nNext steps:`)
    console.log(`  ${colors.gray('cd')} ${projectName}`)
    console.log(`  ${colors.gray('bun install')}`)
    console.log(`  ${colors.gray('bun dev')}`)
  }
})