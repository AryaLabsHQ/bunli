#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import branchCommand from './commands/branch.js'
import prCommand from './commands/pr.js'
import statusCommand from './commands/status.js'
import syncCommand from './commands/sync.js'

const cli = await createCLI()

cli.command(branchCommand)
cli.command(prCommand)
cli.command(syncCommand)
cli.command(statusCommand)

await cli.run()
