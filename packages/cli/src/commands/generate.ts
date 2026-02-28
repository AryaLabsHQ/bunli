import { defineCommand, option } from '@bunli/core'
import { Result, TaggedError } from 'better-result'
import { Generator } from '@bunli/generator'
import { z } from 'zod'
import { dirname, join, resolve } from 'node:path'
import { watch } from 'node:fs/promises'
import { isCommandFile } from '@bunli/generator'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import type { BunliUtils } from '@bunli/utils'


class GenerateCommandError extends TaggedError('GenerateCommandError')<{
  message: string
  cause?: unknown
}>() {}

const failGenerate = (message: string, cause?: unknown): Result<never, GenerateCommandError> =>
  Result.err(new GenerateCommandError({ message, cause }))

export default defineCommand({
  name: 'generate',
  description: 'Generate command type definitions',
  alias: 'gen',
  options: {
    entry: option(z.string().optional(), {
      short: 'e',
      description: 'CLI entry file used for command discovery'
    }),
    directory: option(z.string().optional(), {
      description: 'Optional command source directory fallback'
    }),
    output: option(z.string().default('./.bunli/commands.gen.ts'), {
      short: 'o',
      description: 'Output file'
    }),
    watch: option(z.boolean().default(false), {
      short: 'w',
      description: 'Watch for changes'
    })
  },
  
  async handler({ flags, colors, spinner }) {
    const result = await runGenerate(flags as Record<string, unknown>, colors, spinner)
    if (result.isErr()) {
      throw result.error
    }
  }
})

async function runGenerate(
  flags: Record<string, unknown>,
  colors: BunliUtils['colors'],
  spinner: BunliUtils['spinner']
): Promise<Result<void, GenerateCommandError>> {
    // Load config to get default values
    const config = await loadConfig()
    const typedFlags = flags as {
      entry?: string
      directory?: string
      output: string
      watch: boolean
    }
    
    const configuredEntry = config.commands?.entry || config.build?.entry
    const configuredEntryFile = Array.isArray(configuredEntry) ? configuredEntry[0] : configuredEntry
    const discoveredEntry = await findEntry()
    const finalEntry = typedFlags.entry || configuredEntryFile || discoveredEntry
    if (!finalEntry) {
      return failGenerate(
        'No CLI entry file found. Set commands.entry in bunli.config.ts or pass --entry.'
      )
    }

    const finalDirectory = typedFlags.directory || config.commands?.directory
    const finalOutputFile = typedFlags.output || './.bunli/commands.gen.ts'
    
    const generator = new Generator({
      entry: finalEntry,
      directory: finalDirectory,
      outputFile: finalOutputFile,
      config,
      generateReport: config.commands?.generateReport
    })
    
    // Initial generation
    const spin = spinner('Generating types...')
    const initialResult = await generator.run()
    if (Result.isError(initialResult)) {
      spin.fail('Failed to generate types')
      return failGenerate(initialResult.error.message, initialResult.error)
    }
    spin.succeed('Types generated')
    
    if (typedFlags.watch) {
      const watchDirectory = resolve(finalDirectory || dirname(finalEntry))
      console.log(colors.cyan(`\n👀 Watching ${watchDirectory}...\n`))

      const ac = new AbortController()
      const { signal } = ac
      let aborted = false
      
      // Handle process termination
      const stopWatching = () => {
        aborted = true
        console.log(colors.dim('\nStopping watcher...'))
        ac.abort()
      }
      process.on('SIGINT', stopWatching)
      process.on('SIGTERM', stopWatching)
      
      try {
        const watcher = watch(watchDirectory, { 
          recursive: true,
          signal 
        })
        
        for await (const event of watcher) {
          if (!event.filename || !isCommandFile(event.filename)) continue
          
          console.log(colors.dim(`${event.eventType}: ${event.filename}`))
          const spin = spinner('Regenerating...')
          
          const updateResult = await generator.run({
            type: event.eventType === 'rename' ? 'delete' : 'update',
            path: join(watchDirectory, event.filename)
          })
          if (Result.isError(updateResult)) {
            spin.fail('Failed')
            console.error(colors.red(updateResult.error.message))
          } else {
            spin.succeed('Updated')
          }
        }
      } catch (err) {
        if (aborted || signal.aborted) {
          console.log(colors.dim('Watcher stopped'))
          return Result.ok(undefined)
        }
        return failGenerate(err instanceof Error ? err.message : String(err), err)
      } finally {
        process.off('SIGINT', stopWatching)
        process.off('SIGTERM', stopWatching)
      }
    }
    return Result.ok(undefined)
}
