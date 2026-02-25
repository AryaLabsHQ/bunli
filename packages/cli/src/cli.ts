#!/usr/bin/env bun
import { createCLI } from '@bunli/core'

const cli = await createCLI({
  name: 'bunli',
  version: '0.1.0',
  description: 'The Bunli CLI toolchain for developing, building, and distributing CLIs'
})

// Load commands from manifest
await cli.load({
  dev: () => import('./commands/dev.js'),
  build: () => import('./commands/build.js'),
  generate: () => import('./commands/generate.js'),
  test: () => import('./commands/test.js'),
  release: () => import('./commands/release.js'),
  init: () => import('./commands/init.js')
})

// Run CLI
await cli.run()