#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI({
  name: 'task-runner',
  version: '1.0.0',
  description: 'Task automation CLI with validation and interactivity'
})

await cli.load({
  build: () => import('./commands/build'),
  test: () => import('./commands/test'),
  deploy: () => import('./commands/deploy'),
  setup: () => import('./commands/setup')
})

await cli.run()
