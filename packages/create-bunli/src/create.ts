import type { HandlerArgs } from '@bunli/core'
import { createProject } from './create-project.js'
import path from 'node:path'

interface CreateOptions {
  name?: string
  template: string
  dir?: string
  git: boolean
  install: boolean
  offline?: boolean
}

export async function create(context: HandlerArgs<CreateOptions>) {
  const { flags, positional, prompt, spinner, colors, shell } = context
  
  // Get project name
  let projectName = positional[0] || flags.name
  if (!projectName) {
    projectName = await prompt('Project name:', {
      validate: (value) => {
        if (!value) return 'Project name is required'
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Project name must only contain lowercase letters, numbers, and hyphens'
        }
        return true
      }
    })
  } else if (!/^[a-z0-9-]+$/.test(projectName)) {
    console.error(colors.red('Project name must only contain lowercase letters, numbers, and hyphens'))
    process.exit(1)
  }
  
  // Get directory
  const projectDir = flags.dir || path.join(process.cwd(), projectName!)
  
  // Confirm details
  console.log()
  console.log(colors.bold('Creating Bunli project:'))
  console.log(colors.dim('  Name:     ') + colors.cyan(projectName!))
  console.log(colors.dim('  Template: ') + colors.cyan(flags.template))
  console.log(colors.dim('  Location: ') + colors.cyan(projectDir))
  console.log(colors.dim('  Git:      ') + colors.cyan(flags.git ? 'Yes' : 'No'))
  console.log(colors.dim('  Install:  ') + colors.cyan(flags.install ? 'Yes' : 'No'))
  console.log()
  
  const confirmed = await prompt.confirm('Continue?', { default: true })
  if (!confirmed) {
    console.log(colors.red('Cancelled'))
    process.exit(1)
  }
  
  console.log()
  
  // Create project
  await createProject({
    name: projectName!,
    dir: projectDir,
    template: flags.template,
    git: flags.git,
    install: flags.install,
    offline: flags.offline,
    prompt,
    spinner,
    colors,
    shell
  })
  
  // Success message
  console.log()
  console.log(colors.green('✨ Project created successfully!'))
  console.log()
  console.log('Next steps:')
  console.log(colors.gray(`  cd ${path.relative(process.cwd(), projectDir)}`))
  
  if (!flags.install) {
    console.log(colors.gray(`  bun install`))
  }
  
  console.log(colors.gray(`  bun run dev`))
  
  console.log()
}