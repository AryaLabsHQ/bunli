#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI({
  name: 'validate',
  version: '1.0.0',
  description: 'Schema validation examples'
})

// Load commands from the commands directory
await cli.load({
  basic: () => import('./commands/basic'),
  validation: () => import('./commands/validation'),
  transform: () => import('./commands/transform'),
  errors: () => import('./commands/errors'),
  interactive: () => import('./commands/interactive'),
  batch: () => import('./commands/batch')
})

await cli.run()