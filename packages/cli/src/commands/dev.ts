import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '../config.js'
import { findEntry } from '../utils/find-entry.js'
import { spawn } from 'node:child_process'

export default defineCommand({
  name: 'dev',
  description: 'Run your CLI in development mode with hot reload',
  alias: 'd',
  options: {
    entry: option(
      z.string().optional(),
      { short: 'e', description: 'Entry file (defaults to auto-detect)' }
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
    
    // Determine entry point
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
    
    // Build command
    const args = ['run']
    
    if (flags.watch ?? config.dev?.watch ?? true) {
      args.push('--hot')
    }
    
    if (flags.inspect ?? config.dev?.inspect) {
      const port = flags.port || config.dev?.port || 9229
      args.push(`--inspect=${port}`)
    }
    
    args.push(entryFile)
    
    // Pass through additional arguments
    if (positional.length > 0) {
      args.push('--', ...positional)
    }
    
    console.log(colors.cyan(`Starting dev server...`))
    console.log(colors.dim(`> bun ${args.join(' ')}`))
    console.log()
    
    // Spawn bun process
    const proc = spawn('bun', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    })
    
    proc.on('exit', (code) => {
      process.exit(code || 0)
    })
  }
})