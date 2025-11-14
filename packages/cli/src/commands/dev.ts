import { defineCommand, option } from '@bunli/core'
import { Generator } from '@bunli/generator'
import { bunliCodegenPlugin } from '@bunli/generator/plugin'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import path from 'node:path'

export default defineCommand({
  name: 'dev',
  description: 'Run your CLI in development mode with hot reload',
  alias: 'd',
  options: {
    entry: option(
      z.string().optional(),
      { short: 'e', description: 'Entry file (defaults to auto-detect)' }
    ),
    commandsDir: option(
      z.string().default('commands'),
      { description: 'Commands directory' }
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
      z.number().int().min(1).max(65535).optional(),
      { short: 'p', description: 'Debugger port' }
    )
  },
  handler: async ({ flags, positional, spinner, colors }) => {
    const config = await loadConfig()

    // 1. Initialize generator if codegen is enabled (always enabled)
    if (flags.generate) {
      const generator = new Generator({
        commandsDir: flags.commandsDir,
        outputFile: './.bunli/commands.gen.ts',
        config,
        generateReport: config.commands?.generateReport
      })

      // Initial generation
      const spin = spinner('Generating command types...')
      try {
        await generator.run()
        spin.succeed('Types generated')
      } catch (error) {
        spin.fail('Failed to generate types')
        const message = error instanceof Error ? error.message : String(error)
        console.error(colors.red(message))
        return
      }
    }

    // 2. Find entry point
    const entry = flags.entry || config.build?.entry || await findEntry()
    if (!entry) {
      console.error(colors.red('No entry file found. Please specify with --entry or in bunli.config.ts'))
      process.exit(1)
    }

    const entryFile = Array.isArray(entry) ? entry[0] : entry

    if (!entryFile) {
      console.error(colors.red('Entry file is required'))
      process.exit(1)
    }

    const entryPath = path.resolve(entryFile)

    // 3. Build function that can be called repeatedly
    const buildProject = async () => {
      const result = await Bun.build({
        entrypoints: [entryPath],
        outdir: '.bunli/dev',
        target: 'bun',
        plugins: flags.generate ? [
          bunliCodegenPlugin({
            commandsDir: flags.commandsDir,
            outputFile: './.bunli/commands.gen.ts',
            config,
            generateReport: config.commands?.generateReport
          })
        ] : []
      })

      if (!result.success) {
        console.error(colors.red('Build failed'))
        for (const log of result.logs) {
          console.error(log)
        }
        return null
      }

      return result.outputs[0]
    }

    console.log(colors.cyan('\n👀 Starting dev mode...\n'))

    if (flags.watch ?? config.dev?.watch ?? true) {
      // Watch mode implementation with manual file watching
      let currentProc: ReturnType<typeof Bun.spawn> | null = null

      // Initial build and run
      const output = await buildProject()
      if (output) {
        currentProc = Bun.spawn(['bun', output.path], {
          stdio: ['inherit', 'inherit', 'inherit'],
          env: {
            ...process.env,
            NODE_ENV: 'development'
          },
          onExit: (_subprocess, exitCode, signalCode, _error) => {
            if (exitCode !== 0 && exitCode !== null && !signalCode) {
              console.log(colors.dim(`Process exited with code ${exitCode}`))
            }
          }
        })
      }

      // Watch for file changes
      const { watch } = await import('node:fs/promises')
      const ac = new AbortController()
      const { signal } = ac

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log(colors.dim('\n\nStopping dev server...'))
        if (currentProc) {
          currentProc.kill()
        }
        ac.abort()
        process.exit(0)
      })

      try {
        const watchDir = path.dirname(entryPath)
        const watcher = watch(watchDir, {
          recursive: true,
          signal
        })

        for await (const event of watcher) {
          // Only rebuild for TypeScript/JavaScript files
          if (!event.filename?.match(/\.(ts|tsx|js|jsx)$/)) continue

          // Skip generated files and build artifacts to prevent infinite loops
          if (event.filename?.includes('commands.gen.ts')) continue
          if (event.filename?.includes('.bunli/')) continue

          if (flags.clearScreen) console.clear()
          console.log(colors.dim(`[${new Date().toLocaleTimeString()}] File changed: ${event.filename}`))
          console.log(colors.cyan('Rebuilding...'))

          const output = await buildProject()
          if (output) {
            // Kill old process
            if (currentProc) {
              currentProc.kill()
              // Wait a bit for the process to actually exit
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Start new process
            currentProc = Bun.spawn(['bun', output.path], {
              stdio: ['inherit', 'inherit', 'inherit'],
              env: {
                ...process.env,
                NODE_ENV: 'development'
              },
              onExit: (_subprocess, exitCode, signalCode, _error) => {
                if (exitCode !== 0 && exitCode !== null && !signalCode) {
                  console.log(colors.dim(`Process exited with code ${exitCode}`))
                }
              }
            })

            console.log(colors.green('✓ Reloaded\n'))
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log(colors.dim('Watch stopped'))
          return
        }
        throw err
      }
    } else {
      // Non-watch mode - just run once
      const output = await buildProject()
      if (output) {
        const proc = Bun.spawn(['bun', output.path], {
          stdio: ['inherit', 'inherit', 'inherit'],
          env: {
            ...process.env,
            NODE_ENV: 'development'
          },
          onExit: (_subprocess, exitCode, signalCode, _error) => {
            if (exitCode !== 0 && exitCode !== null && !signalCode) {
              console.log(colors.dim(`Process exited with code ${exitCode}`))
            }
          }
        })

        await proc.exited
        process.exit(proc.exitCode ?? 0)
      } else {
        process.exit(1)
      }
    }
  }
})