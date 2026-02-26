import type { BunliUtils } from '@bunli/utils'
import { processTemplate, resolveTemplateSource, isLocalTemplate, getBundledTemplatePath } from './template-engine.js'
import type { CreateOptions } from './types.js'
import { Result, TaggedError } from 'better-result'

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const tryAsync = <TValue, TError>(
  fn: () => Promise<TValue>,
  mapError: (cause: unknown) => TError
) => Result.tryPromise({ try: fn, catch: mapError })

interface CreateProjectOptions extends CreateOptions {
  name: string
  dir: string
  template: string
  prompt: BunliUtils['prompt']
  spinner: BunliUtils['spinner']
  colors: BunliUtils['colors']
  shell: typeof Bun.$
}

class UserCancelledError extends TaggedError('UserCancelledError')<{
  message: string
}>() {
  constructor(message: string) {
    super({ message })
  }
}

class ShellCommandError extends TaggedError('ShellCommandError')<{
  message: string
  command: string
  output: string
}>() {
  constructor(command: string, output: string) {
    super({
      message: `Command failed (${command}): ${output}`,
      command,
      output
    })
  }
}

class TemplateProcessingError extends TaggedError('TemplateProcessingError')<{
  message: string
  cause: unknown
}>() {
  constructor(cause: unknown) {
    super({ message: `Failed to process template: ${toErrorMessage(cause)}`, cause })
  }
}

export type CreateProjectError = UserCancelledError | ShellCommandError | TemplateProcessingError

export async function createProject(
  options: CreateProjectOptions
): Promise<Result<void, CreateProjectError>> {
  const { name, dir, template, git, install, prompt, spinner, colors, shell, offline } = options

  const directoryCheck = await shell`test -d ${dir}`.nothrow()
  if (directoryCheck.exitCode === 0) {
    const overwrite = await prompt.confirm(`Directory ${dir} already exists. Overwrite?`, { default: false })
    if (!overwrite) {
      return Result.err(new UserCancelledError('Cancelled'))
    }

    const removeDirectory = await shell`rm -rf ${dir}`.nothrow()
    if (removeDirectory.exitCode !== 0) {
      return Result.err(new ShellCommandError(`rm -rf ${dir}`, removeDirectory.stderr.toString().trim()))
    }
  }

  const spin = spinner('Creating project structure...')
  spin.start()

  const mkdirResult = await shell`mkdir -p ${dir}`.nothrow()
  if (mkdirResult.exitCode !== 0) {
    spin.fail('Failed to create project directory')
    return Result.err(new ShellCommandError(`mkdir -p ${dir}`, mkdirResult.stderr.toString().trim()))
  }

  let templateSource = template
  if (await isLocalTemplate(template)) {
    templateSource = getBundledTemplatePath(template)
  } else {
    templateSource = resolveTemplateSource(template)
  }

  const templateResult = await tryAsync(
    () =>
      processTemplate({
        source: templateSource,
        dir,
        offline,
        variables: {
          name,
          version: '0.1.0',
          description: 'A CLI built with Bunli',
          author: '',
          license: 'MIT',
          year: new Date().getFullYear().toString()
        }
      }),
    (cause) => new TemplateProcessingError(cause)
  )

  if (Result.isError(templateResult)) {
    spin.fail('Failed to create project')
    console.error(colors.red(templateResult.error.message))

    const cleanup = await shell`rm -rf ${dir}`.nothrow()
    if (cleanup.exitCode !== 0) {
      console.error(colors.yellow(`Warning: cleanup failed: ${cleanup.stderr.toString().trim()}`))
    }

    return templateResult
  }

  spin.succeed('Project structure created')

  if (git) {
    const gitSpin = spinner('Initializing git repository...')
    gitSpin.start()

    const gitInit = await shell`cd ${dir} && git init`.nothrow()
    const gitAdd = await shell`cd ${dir} && git add .`.nothrow()
    const gitCommit = await shell`cd ${dir} && git commit -m "feat: initialize ${name} CLI project with Bunli

- Generated using create-bunli template
- Includes basic CLI structure with commands directory
- Configured with Bunli build system and TypeScript
- Ready for development with bun run dev"`.nothrow()

    if (gitInit.exitCode === 0 && gitAdd.exitCode === 0 && gitCommit.exitCode === 0) {
      gitSpin.succeed('Git repository initialized')
    } else {
      gitSpin.fail('Failed to initialize git repository')
      const output = [gitInit.stderr, gitAdd.stderr, gitCommit.stderr]
        .map((value) => value.toString().trim())
        .filter(Boolean)
        .join('\n')
      if (output) {
        console.error(colors.dim(`  ${output}`))
      }
    }
  }

  if (install) {
    const installSpin = spinner('Installing dependencies...')
    installSpin.start()

    const installResult = await shell`cd ${dir} && bun install`.nothrow()
    if (installResult.exitCode === 0) {
      installSpin.succeed('Dependencies installed')
    } else {
      installSpin.fail('Failed to install dependencies')
      console.error(colors.dim('  You can install them manually by running: bun install'))
      const errorOutput = installResult.stderr.toString().trim()
      if (errorOutput) {
        console.error(colors.dim(`  ${errorOutput}`))
      }
    }
  }

  return Result.ok(undefined)
}
