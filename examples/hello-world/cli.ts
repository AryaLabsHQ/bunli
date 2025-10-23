#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import greetCommand from './commands/greet.js'

const cli = await createCLI({
  name: 'hello-world',
  version: '1.0.0',
  description: 'Hello World - Simplest possible Bunli CLI'
})

cli.command(greetCommand)
await cli.run()