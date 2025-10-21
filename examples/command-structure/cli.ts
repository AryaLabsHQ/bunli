#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import commands from './commands'

const cli = await createCLI({
  name: 'myapp',
  version: '1.0.0',
  description: 'Example showing command structure and organization'
  // generated is automatically enabled
})

// Load commands from manifest (lazy loaded)
await cli.load(commands)

await cli.run()