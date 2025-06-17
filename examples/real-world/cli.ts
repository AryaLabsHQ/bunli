#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import config from './bunli.config'

const cli = createCLI(config)

// Initialize (loads commands from config)
await cli.init()

// Run
await cli.run()