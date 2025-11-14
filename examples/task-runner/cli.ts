#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI()

await cli.load({
  build: () => import('./commands/build'),
  test: () => import('./commands/test'),
  deploy: () => import('./commands/deploy'),
  setup: () => import('./commands/setup')
})

await cli.run()
