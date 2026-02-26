import type { HandlerArgs } from '@bunli/core'
import { createProject, type CreateProjectError } from './create-project.js'
import path from 'node:path'
import { Result, TaggedError } from 'better-result'

interface CreateOptions {
  name?: string
  template: string
  dir?: string
  git: boolean
  install: boolean
  offline?: boolean
}

class InvalidProjectNameError extends TaggedError('InvalidProjectNameError')<{
  message: string
}>() {
  constructor(name: string) {
    super({ message: `Project name "${name}" must only contain lowercase letters, numbers, and hyphens` })
  }
}

class UserCancelledError extends TaggedError('UserCancelledError')<{
  message: string
}>() {
  constructor(message: string) {
    super({ message })
  }
}

export type CreateCommandError = InvalidProjectNameError | UserCancelledError | CreateProjectError

export async function create(
  context: HandlerArgs<CreateOptions>
): Promise<Result<void, CreateCommandError>> {
  const { flags, positional, prompt, colors, spinner, shell } = context

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
  }

  if (!projectName || !/^[a-z0-9-]+$/.test(projectName)) {
    const invalidName = projectName || ''
    console.error(colors.red(`Project name must only contain lowercase letters, numbers, and hyphens`))
    return Result.err(new InvalidProjectNameError(invalidName))
  }

  const projectDir = flags.dir || path.join(process.cwd(), projectName)

  console.log()
  console.log(colors.bold('Creating Bunli project:'))
  console.log(colors.dim('  Name:     ') + colors.cyan(projectName))
  console.log(colors.dim('  Template: ') + colors.cyan(flags.template))
  console.log(colors.dim('  Location: ') + colors.cyan(projectDir))
  console.log(colors.dim('  Git:      ') + colors.cyan(flags.git ? 'Yes' : 'No'))
  console.log(colors.dim('  Install:  ') + colors.cyan(flags.install ? 'Yes' : 'No'))
  console.log()

  const confirmed = await prompt.confirm('Continue?', { default: true })
  if (!confirmed) {
    console.log(colors.yellow('Cancelled'))
    return Result.err(new UserCancelledError('Cancelled'))
  }

  console.log()

  const projectResult = await createProject({
    name: projectName,
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

  if (Result.isError(projectResult)) {
    if (projectResult.error._tag !== 'UserCancelledError') {
      console.error(colors.red(projectResult.error.message))
    }
    return projectResult
  }

  console.log()
  console.log(colors.green('✨ Project created successfully!'))
  console.log()
  console.log('Next steps:')
  console.log(colors.gray(`  cd ${path.relative(process.cwd(), projectDir)}`))

  if (!flags.install) {
    console.log(colors.gray('  bun install'))
  }

  console.log(colors.gray('  bun run dev'))
  console.log()

  return Result.ok(undefined)
}
