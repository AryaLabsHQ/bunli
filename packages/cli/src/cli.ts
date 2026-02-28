#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import buildCommand from './commands/build.js'
import devCommand from './commands/dev.js'
import generateCommand from './commands/generate.js'
import initCommand from './commands/init.js'
import releaseCommand from './commands/release.js'
import testCommand from './commands/test.js'
import doctorCommand from './commands/doctor.js'

const cli = await createCLI({
  name: 'bunli',
  version: '0.1.0',
  description: 'The Bunli CLI toolchain for developing, building, and distributing CLIs'
})

cli.command(devCommand)
cli.command(buildCommand)
cli.command(generateCommand)
cli.command(testCommand)
cli.command(releaseCommand)
cli.command(initCommand)
cli.command(doctorCommand)

await cli.run()
