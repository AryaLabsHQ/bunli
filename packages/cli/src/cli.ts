#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { loadConfig } from './config.js'

const cli = await createCLI({
  name: 'bunli',
  version: '0.1.0',
  description: 'The Bunli CLI toolchain for developing, building, and distributing CLIs'
})

// Load configuration
const config = await loadConfig()

// Load commands from manifest
await cli.load({
  dev: () => import('./commands/dev.js') as any,
  build: () => import('./commands/build.js') as any,
  generate: () => import('./commands/generate.js') as any,
  test: () => import('./commands/test.js') as any,
  release: () => import('./commands/release.js') as any,
  init: () => import('./commands/init.js') as any
})

// Run CLI
await cli.run()