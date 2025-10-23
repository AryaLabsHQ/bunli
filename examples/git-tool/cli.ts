#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI({
  name: 'git-tool',
  version: '1.0.0',
  description: 'Git workflow automation CLI'
})

await cli.load({
  branch: () => import('./commands/branch'),
  pr: () => import('./commands/pr'),
  sync: () => import('./commands/sync'),
  status: () => import('./commands/status')
})

await cli.run()
