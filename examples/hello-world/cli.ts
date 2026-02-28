#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { registerTuiRenderer } from '@bunli/tui'
import greetCommand from './commands/greet.js'
import passwordCommand from './commands/password.js'
import passwordPromptCommand from './commands/password-prompt.js'
import showcaseCommand from './commands/showcase.js'

const cli = await createCLI()
registerTuiRenderer()

cli.command(greetCommand)
cli.command(passwordCommand)
cli.command(passwordPromptCommand)
cli.command(showcaseCommand)
await cli.run()
