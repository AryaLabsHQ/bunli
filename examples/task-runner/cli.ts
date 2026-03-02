#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import buildCommand from './commands/build.js'
import deployCommand from './commands/deploy.js'
import setupCommand from './commands/setup.js'
import testCommand from './commands/test.js'

const cli = await createCLI()

cli.command(buildCommand)
cli.command(testCommand)
cli.command(deployCommand)
cli.command(setupCommand)

await cli.run()
