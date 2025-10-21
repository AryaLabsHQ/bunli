#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import config from './bunli.config'

const cli = await createCLI({
  ...config,
  plugins: [] as const
  // generated is automatically enabled
})

await cli.init()
await cli.run()