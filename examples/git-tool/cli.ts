#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI()

await cli.load({
  branch: () => import('./commands/branch'),
  pr: () => import('./commands/pr'),
  sync: () => import('./commands/sync'),
  status: () => import('./commands/status')
})

await cli.run()
