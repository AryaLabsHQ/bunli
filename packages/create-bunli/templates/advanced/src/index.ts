#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { initCommand } from './commands/init.js'
import { validateCommand } from './commands/validate.js'
import { serveCommand } from './commands/serve.js'
import { configCommand } from './commands/config.js'
import { loadConfig } from './utils/config.js'

const cli = await createCLI({
  name: '{{name}}',
  version: '0.1.0',
  description: '{{description}}'
})

// Global options
cli.option('verbose', {
  type: 'boolean',
  description: 'Enable verbose output'
})

cli.option('quiet', {
  type: 'boolean',
  description: 'Suppress output'
})

// Add commands
cli.command(initCommand)
cli.command(validateCommand)
cli.command(serveCommand)
cli.command(configCommand)

// Load config and run
async function run() {
  try {
    const config = await loadConfig()
    // Store config in global context if needed
    await cli.run()
  } catch (error) {
    console.error('Failed to start CLI:', error)
    process.exit(1)
  }
}

await run()