#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { logger } from '@{{projectName}}/utils'
import { processCommand, analyzeCommand } from '@{{projectName}}/core'

const cli = createCLI({
  name: '{{projectName}}',
  version: '0.1.0',
  description: '{{description}}'
})

// Add commands
cli.command(processCommand)
cli.command(analyzeCommand)

// Run CLI
try {
  await cli.run()
} catch (error) {
  logger.error('CLI failed:', error)
  process.exit(1)
}