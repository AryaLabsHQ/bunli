import { defineCommand, option } from '@bunli/core'
import { Generator } from '@bunli/generator'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import path from 'node:path'
import { existsSync } from 'node:fs'

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

    // Generate types if codegen is enabled
    const generateTypes = async () => {
      if (!flags.generate) return

      const generator = new Generator({
        commandsDir: flags.commandsDir,
        outputFile: './.bunli/commands.gen.ts',
        config,
        generateReport: config.commands?.generateReport
      })

      try {
        await generator.run()
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(colors.red(`Failed to generate types: ${message}`))
        return false
      }
    }

    // Initial type generation
    if (flags.generate) {
      const spin = spinner('Generating command types...')
      const success = await generateTypes()
      if (success) {
        spin.succeed('Types generated')
      } else {
        spin.fail('Failed to generate types')
        process.exit(1)
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
    if (!existsSync(entryPath)) {
      console.error(colors.red(`Entry file not found: ${entryPath}`))
      process.exit(1)
    }

    // Build bun command args
    const bunArgs: string[] = []
    
    // Use --hot for hot reload (Bun's native hot reload)
    if (flags.watch ?? config.dev?.watch ?? true) {
      bunArgs.push('--hot')
    }

    // Add inspect flag if enabled
    if (flags.inspect) {
      bunArgs.push('--inspect')
      if (flags.port) {
        bunArgs.push(`--inspect-port=${flags.port}`)
      }
    } else if (flags.port) {
      // If port is specified without inspect, still add it
      bunArgs.push(`--inspect-port=${flags.port}`)
    }

    // Add the entry file
    bunArgs.push(entryPath)

    // Add any positional arguments (passed through to the CLI)
    if (positional.length > 0) {
      bunArgs.push(...positional)
    }

    console.log(colors.cyan('\n👀 Starting dev mode...\n'))
    if (flags.watch ?? config.dev?.watch ?? true) {
      console.log(colors.dim(`Running: bun ${bunArgs.join(' ')}\n`))
    }

    // Watch for changes in commands directory to regenerate types
    let ac: AbortController | null = null
    if (flags.watch ?? config.dev?.watch ?? true) {
      const commandsDir = path.resolve(flags.commandsDir)
      if (existsSync(commandsDir) && flags.generate) {
        const { watch } = await import('node:fs/promises')
        ac = new AbortController()
        const { signal } = ac

        // Watch commands directory for type regeneration
        const watchCommands = async () => {
          try {
            const watcher = watch(commandsDir, {
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
              const success = await generateTypes()
              if (success) {
                spin.succeed('Types regenerated')
              } else {
                spin.fail('Failed to regenerate types')
              }
            }
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              throw err
            }
          }
        }

        // Start watching in background
        watchCommands().catch(err => {
          console.error(colors.red(`Watch error: ${err.message}`))
        })
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

    const handleExit = () => {
      console.log(colors.dim('\n\nStopping dev server...'))
      // Abort file watcher if it exists
      if (ac) {
        ac.abort()
      }
      // Kill the spawned process
      proc.kill()
      process.exit(0)
    }
    process.on('SIGINT', handleExit)
    process.on('SIGTERM', handleExit)

    // Wait for process to exit
    await proc.exited
    // Abort file watcher if it exists
    if (ac) {
      ac.abort()
    }
    process.exit(proc.exitCode ?? 0)
  }
})
