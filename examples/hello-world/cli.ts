#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import greetCommand from './commands/greet.js'

const cli = await createCLI()

cli.command(greetCommand)
await cli.run()