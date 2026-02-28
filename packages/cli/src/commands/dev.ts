import { defineCommand, option } from '@bunli/core'
import { Result, TaggedError } from 'better-result'
import { Generator } from '@bunli/generator'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import path from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { watch } from 'node:fs/promises'
import type { PromptSpinnerFactory } from '@bunli/core'
import type { Colors } from '@bunli/utils'


const DevCommandError = TaggedError('DevCommandError')<{
  message: string
  cause?: unknown
}>()
type DevCommandErrorType = InstanceType<typeof DevCommandError>

const failDev = (message: string, cause?: unknown): Result<never, DevCommandErrorType> =>
  Result.err(new DevCommandError({ message, cause }))

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory()
  } catch {
    return false
  }
}

export function resolveWatchDirectory(entryPath: string, configuredDirectory?: string): string | null {
  if (configuredDirectory) {
    return path.resolve(configuredDirectory)
  }

  const cwd = process.cwd()
  const defaultCommandsDir = path.resolve(cwd, 'commands')
  if (isDirectory(defaultCommandsDir)) {
    return defaultCommandsDir
  }

  const srcCommandsDir = path.resolve(cwd, 'src/commands')
  if (isDirectory(srcCommandsDir)) {
    return srcCommandsDir
  }

  const entryDirectory = path.dirname(entryPath)
  if (entryDirectory !== cwd) {
    return entryDirectory
  }

  const srcDir = path.resolve(cwd, 'src')
  if (isDirectory(srcDir)) {
    return srcDir
  }

  return null
}

export default defineCommand({
  name: 'dev',
  description: 'Run your CLI in development mode with hot reload',
  alias: 'd',
  options: {
    entry: option(
      z.string().optional(),
      { short: 'e', description: 'Entry file (defaults to auto-detect)' }
    ),
    generate: option(
      z.boolean().default(true),
      { description: 'Enable codegen' }
    ),
    clearScreen: option(
      z.boolean().default(true),
      { description: 'Clear screen on reload' }
    ),
    watch: option(
      z.boolean().default(true),
      { short: 'w', description: 'Watch for changes' }
    ),
    inspect: option(
      z.boolean().default(false),
      { short: 'i', description: 'Enable debugger' }
    ),
    port: option(
      z.coerce.number().int().min(1).max(65535).optional(),
      { short: 'p', description: 'Debugger port' }
    )
  },
  handler: async ({ flags, positional, spinner, colors }) => {
    const result = await runDev(flags as Record<string, unknown>, positional, spinner, colors)
    if (result.isErr()) {
      throw result.error
    }
  }
})

async function runDev(
  flags: Record<string, unknown>,
  positional: string[],
  spinner: PromptSpinnerFactory,
  colors: Colors
): Promise<Result<void, DevCommandErrorType>> {
    const config = await loadConfig()
    const typedFlags = flags as {
      entry?: string
      generate: boolean
      clearScreen: boolean
      watch: boolean
      inspect: boolean
      port?: number
    }

    // Generate types if codegen is enabled
    const generateTypes = async (): Promise<Result<void, DevCommandErrorType>> => {
      if (!typedFlags.generate) return Result.ok(undefined)

      const configuredEntry = config.commands?.entry || config.build?.entry
      const configuredEntryFile = Array.isArray(configuredEntry) ? configuredEntry[0] : configuredEntry
      const discoveredEntry = await findEntry()
      const resolvedEntry = typedFlags.entry || configuredEntryFile || discoveredEntry
      if (!resolvedEntry) {
        return failDev('No entry file found for code generation. Set commands.entry or pass --entry.')
      }

      const generator = new Generator({
        entry: resolvedEntry,
        directory: config.commands?.directory,
        outputFile: './.bunli/commands.gen.ts',
        config,
        generateReport: config.commands?.generateReport
      })

      const generationResult = await generator.run()
      if (Result.isError(generationResult)) {
        return failDev(`Failed to generate types: ${generationResult.error.message}`, generationResult.error)
      }
      return Result.ok(undefined)
    }

    // Initial type generation
    if (typedFlags.generate) {
      const spin = spinner('Generating command types...')
      const generationResult = await generateTypes()
      if (generationResult.isErr()) {
        spin.fail('Failed to generate types')
        return generationResult
      }
      spin.succeed('Types generated')
    }

    // 2. Find entry point
    const configuredEntry = config.commands?.entry || config.build?.entry
    const configuredEntryFile = Array.isArray(configuredEntry) ? configuredEntry[0] : configuredEntry
    const entry = typedFlags.entry || configuredEntryFile || await findEntry()
    if (!entry) {
      return failDev('No entry file found. Please specify with --entry or in bunli.config.ts')
    }

    const entryFile = Array.isArray(entry) ? entry[0] : entry
    if (!entryFile) {
      return failDev('Entry file is required')
    }

    const entryPath = path.resolve(entryFile)
    if (!existsSync(entryPath)) {
      return failDev(`Entry file not found: ${entryPath}`)
    }

    // Build bun command args
    const bunArgs: string[] = []
    
    // Use --hot for hot reload (Bun's native hot reload)
    if (typedFlags.watch ?? config.dev?.watch ?? true) {
      bunArgs.push('--hot')
    }

    // Add inspect flag if enabled
    if (typedFlags.inspect) {
      bunArgs.push('--inspect')
      if (typedFlags.port) {
        bunArgs.push(`--inspect-port=${typedFlags.port}`)
      }
    } else if (typedFlags.port) {
      // If port is specified without inspect, still add it
      bunArgs.push(`--inspect-port=${typedFlags.port}`)
    }

    // Add the entry file
    bunArgs.push(entryPath)

    // Add any positional arguments (passed through to the CLI)
    if (positional.length > 0) {
      bunArgs.push(...positional)
    }

    console.log(colors.cyan('\n👀 Starting dev mode...\n'))
    if (typedFlags.watch ?? config.dev?.watch ?? true) {
      console.log(colors.dim(`Running: bun ${bunArgs.join(' ')}\n`))
    }

    // Watch for changes in commands directory to regenerate types
    let ac: AbortController | null = null
    if (typedFlags.watch ?? config.dev?.watch ?? true) {
      const watchDirectory = resolveWatchDirectory(entryPath, config.commands?.directory)
      if (typedFlags.generate && watchDirectory && existsSync(watchDirectory)) {
        console.log(colors.dim(`Watching command changes in ${watchDirectory}`))
        ac = new AbortController()
        const { signal } = ac

        // Watch commands directory for type regeneration
        const watchCommands = async () => {
          try {
            const watcher = watch(watchDirectory, {
              recursive: true,
              signal
            })

            for await (const event of watcher) {
              // Only regenerate for TypeScript/JavaScript files
              if (!event.filename?.match(/\.(ts|tsx|js|jsx)$/)) continue
              
              // Skip generated files
              if (event.filename?.includes('commands.gen.ts')) continue
              if (event.filename?.includes('.bunli/')) continue

              console.log(colors.dim(`\n[${new Date().toLocaleTimeString()}] Command file changed: ${event.filename}`))
              const spin = spinner('Regenerating types...')
              const generationResult = await generateTypes()
              if (generationResult.isErr()) {
                spin.fail('Failed to regenerate types')
                console.error(colors.red(generationResult.error.message))
              } else {
                spin.succeed('Types regenerated')
              }
            }
          } catch (err) {
            if (!signal.aborted) {
              throw err
            }
          }
        }

        // Start watching in background
        watchCommands().catch(err => {
          console.error(colors.red(`Watch error: ${err.message}`))
        })
      } else if (typedFlags.generate && watchDirectory && !existsSync(watchDirectory)) {
        console.log(colors.yellow(`Skipping command watcher: directory does not exist (${watchDirectory})`))
      } else if (typedFlags.generate && !watchDirectory) {
        console.log(colors.yellow('Skipping command watcher: set commands.directory to avoid watching the project root'))
      }
    }

    // Run the CLI with Bun
    const proc = Bun.spawn(['bun', ...bunArgs], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    })

    let terminatedBySignal = false
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined
    const handleExit = () => {
      if (terminatedBySignal) return
      terminatedBySignal = true
      console.log(colors.dim('\n\nStopping dev server...'))
      // Abort file watcher if it exists
      if (ac) {
        ac.abort()
      }
      // Kill the spawned process
      proc.kill()
      forceKillTimer = setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {
          // Process already exited
        }
      }, 3000)
    }
    process.on('SIGINT', handleExit)
    process.on('SIGTERM', handleExit)

    // Wait for process to exit
    const exitCode = await proc.exited
    if (forceKillTimer) {
      clearTimeout(forceKillTimer)
    }
    // Abort file watcher if it exists
    if (ac) {
      ac.abort()
    }
    process.off('SIGINT', handleExit)
    process.off('SIGTERM', handleExit)

    if (terminatedBySignal) {
      return Result.ok(undefined)
    }
    if (exitCode !== 0) {
      return failDev(`Dev process exited with code ${exitCode}`)
    }
    return Result.ok(undefined)
}
