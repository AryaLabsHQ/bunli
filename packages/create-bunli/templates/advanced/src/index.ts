#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { Result, TaggedError } from 'better-result'
import initCommand from './commands/init.js'
import validateCommand from './commands/validate.js'
import serveCommand from './commands/serve.js'
import configCommand from './commands/config.js'
import { loadConfig } from './utils/config.js'

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

class CliStartupError extends TaggedError('CliStartupError')<{
  message: string
  cause: unknown
}>() {
  constructor(cause: unknown) {
    super({ message: `Failed to start CLI: ${toErrorMessage(cause)}`, cause })
  }
}

const cli = await createCLI({
  name: '{{name}}',
  version: '0.1.0',
  description: '{{description}}'
})

cli.command(initCommand)
cli.command(validateCommand)
cli.command(serveCommand)
cli.command(configCommand)

async function run(): Promise<Result<void, CliStartupError>> {
  const configResult = await Result.tryPromise({
    try: () => loadConfig(),
    catch: (cause) => new CliStartupError(cause)
  })

  if (Result.isError(configResult)) {
    return configResult
  }

  return Result.tryPromise({
    try: async () => {
      await cli.run()
    },
    catch: (cause) => new CliStartupError(cause)
  })
}

const result = await run()
if (Result.isError(result)) {
  console.error(result.error.message)
  process.exit(1)
}
