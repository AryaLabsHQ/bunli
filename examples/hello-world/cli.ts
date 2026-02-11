#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { registerTuiRenderer } from '@bunli/tui'
import greetCommand from './commands/greet.js'

const cli = await createCLI()
registerTuiRenderer()

cli.command(greetCommand)
await cli.run()
