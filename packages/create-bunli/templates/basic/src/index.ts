#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { helloCommand } from './commands/hello.js'

const cli = createCLI({
  name: '{{projectName}}',
  version: '0.1.0',
  description: '{{description}}'
})

cli.command(helloCommand)

await cli.run()