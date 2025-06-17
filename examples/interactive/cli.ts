#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = createCLI({
  name: 'interactive',
  version: '1.0.0',
  description: 'Interactive CLI examples with prompts and progress'
})

await cli.load({
  setup: () => import('./commands/setup'),
  deploy: () => import('./commands/deploy'),
  survey: () => import('./commands/survey')
})

await cli.run()