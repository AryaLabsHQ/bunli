#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { registerTuiRenderer } from '@bunli/tui'
import greetCommand from './commands/greet.js'
import showcaseCommand from './commands/showcase.js'

const cli = await createCLI()
registerTuiRenderer()

cli.command(greetCommand)
cli.command(showcaseCommand)
await cli.run()
