#!/usr/bin/env bun
import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { create, UserCancelledError } from './create.js'
import { Result } from 'better-result'

async function run(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0]?.startsWith('-')) {
    process.argv.splice(2, 0, 'create')
  } else if (args[0] && !args[0].startsWith('-') && args[0] !== 'create') {
    process.argv.splice(2, 0, 'create')
  }

  const cli = await createCLI({
    name: 'create-bunli',
    version: '0.1.0',
    description: 'Scaffold new Bunli CLI projects'
  })

  cli.command(defineCommand({
    name: 'create',
    description: 'Create a new Bunli CLI project',
    options: {
      name: option(z.string().optional(), { description: 'Project name' }),
      template: option(
        z.string().default('basic'),
        { short: 't', description: 'Project template (basic, advanced, monorepo, or github:user/repo)' }
      ),
      dir: option(
        z.string().optional(),
        { short: 'd', description: 'Directory to create project in' }
      ),
      git: option(
        z.boolean().default(true),
        { short: 'g', description: 'Initialize git repository' }
      ),
      install: option(
        z.boolean().default(true),
        { short: 'i', description: 'Install dependencies' }
      ),
      offline: option(
        z.boolean().default(false),
        { description: 'Use cached templates when available' }
      )
    },
    handler: async (context) => {
      const result = await create(context)
      if (Result.isError(result) && !UserCancelledError.is(result.error)) {
        process.exitCode = 1
      }
    }
  }))

  await cli.run()
}

try {
  await run()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
