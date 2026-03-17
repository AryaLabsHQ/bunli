import type { BunliConfigInput, CLI, Command } from '@bunli/core'
import type { BunliPlugin } from '@bunli/core/plugin'
import { createCLI } from '@bunli/core'

export interface TestCLIConfig {
  /** CLI name (defaults to 'test-cli') */
  name?: string
  /** CLI version (defaults to '1.0.0') */
  version?: string
  /** CLI description */
  description?: string
  /** Commands to register */
  commands?: Command<any, any>[]
  /** Plugins to load */
  plugins?: BunliPlugin[]
  /** Environment variable overrides */
  env?: Record<string, string | undefined>
  /** Additional config overrides */
  config?: Partial<BunliConfigInput>
}

export interface TestCLIRunResult {
  /** Captured stdout lines joined by newlines */
  stdout: string
  /** Captured stderr lines joined by newlines */
  stderr: string
  /** Process exit code (0 = success) */
  exitCode: number
  /** Any error thrown during execution */
  error?: Error
}

export interface TestCLIInstance {
  /** Run the CLI with the given argv (like process.argv.slice(2)) */
  run(argv: string[]): Promise<TestCLIRunResult>
  /** Execute a named command programmatically */
  execute(commandName: string, args?: string[], options?: Record<string, unknown>): Promise<TestCLIRunResult>
  /** The underlying CLI instance (available after first run/execute) */
  readonly cli: CLI | undefined
}

/**
 * Create a test CLI harness that captures stdout/stderr and intercepts process.exit.
 *
 * @example
 * ```ts
 * const testCli = await createTestCLI({
 *   commands: [myCommand],
 *   env: { DEBUG: 'true' },
 * })
 *
 * const result = await testCli.run(['my-command', '--flag', 'value'])
 * expect(result.exitCode).toBe(0)
 * expect(result.stdout).toContain('success')
 * ```
 */
export async function createTestCLI(config: TestCLIConfig = {}): Promise<TestCLIInstance> {
  const {
    name = 'test-cli',
    version = '1.0.0',
    description = 'Test CLI',
    commands = [],
    plugins = [],
    env: envOverrides,
    config: configOverrides,
  } = config

  let cliInstance: CLI | undefined

  async function ensureCLI(): Promise<CLI> {
    if (cliInstance) return cliInstance

    // Apply env overrides
    const originalEnv: Record<string, string | undefined> = {}
    if (envOverrides) {
      for (const [key, value] of Object.entries(envOverrides)) {
        originalEnv[key] = process.env[key]
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      }
    }

    try {
      const cli = await createCLI({
        name,
        version,
        description,
        plugins: plugins as any,
        ...configOverrides,
      } as any)

      for (const cmd of commands) {
        cli.command(cmd)
      }

      cliInstance = cli
      return cli
    } finally {
      // Restore env after CLI creation
      if (envOverrides) {
        for (const [key, value] of Object.entries(originalEnv)) {
          if (value === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = value
          }
        }
      }
    }
  }

  async function capturedRun(fn: (cli: CLI) => Promise<void>): Promise<TestCLIRunResult> {
    const stdoutLines: string[] = []
    const stderrLines: string[] = []
    let exitCode = 0
    let error: Error | undefined

    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalExit = process.exit

    console.log = (...args: any[]) => {
      stdoutLines.push(args.join(' '))
    }
    console.error = (...args: any[]) => {
      stderrLines.push(args.join(' '))
    }
    console.warn = (...args: any[]) => {
      stderrLines.push(args.join(' '))
    }
    ;(process.exit as any) = (code?: number) => {
      exitCode = code ?? 0
      throw new ExitInterrupt(exitCode)
    }

    // Apply env overrides during run
    const originalEnv: Record<string, string | undefined> = {}
    if (envOverrides) {
      for (const [key, value] of Object.entries(envOverrides)) {
        originalEnv[key] = process.env[key]
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      }
    }

    try {
      const cli = await ensureCLI()
      await fn(cli)
    } catch (err) {
      if (err instanceof ExitInterrupt) {
        exitCode = err.code
      } else {
        error = err as Error
        exitCode = 1
        stderrLines.push((err as Error).message || String(err))
      }
    } finally {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      process.exit = originalExit

      if (envOverrides) {
        for (const [key, value] of Object.entries(originalEnv)) {
          if (value === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = value
          }
        }
      }
    }

    return {
      stdout: stdoutLines.join('\n'),
      stderr: stderrLines.join('\n'),
      exitCode,
      error,
    }
  }

  return {
    async run(argv: string[]): Promise<TestCLIRunResult> {
      return capturedRun((cli) => cli.run(argv))
    },

    async execute(
      commandName: string,
      args?: string[],
      options?: Record<string, unknown>
    ): Promise<TestCLIRunResult> {
      return capturedRun((cli) => {
        // Use the base overload: execute(commandName: string, args?: string[])
        const exec = cli.execute.bind(cli) as (name: string, args?: string[], opts?: Record<string, unknown>) => Promise<void>
        if (args && options) {
          return exec(commandName, args, options)
        }
        if (args) {
          return exec(commandName, args)
        }
        return exec(commandName)
      })
    },

    get cli() {
      return cliInstance
    },
  }
}

class ExitInterrupt extends Error {
  constructor(public readonly code: number) {
    super(`Process exited with code ${code}`)
  }
}
