#!/usr/bin/env bun
import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Minimal example - single command CLI
const greetCommand = defineCommand({
  name: 'greet',
  description: 'A minimal greeting CLI',
  options: {
    // Simple string with default
    name: option(z.string().default('world')),
    
    // Boolean with short flag
    loud: option(
      z.coerce.boolean().default(false),
      { short: 'l', description: 'Shout the greeting' }
    ),
    
    // Number with validation
    times: option(
      z.coerce.number().int().positive().default(1),
      { short: 't', description: 'Number of times to greet' }
    )
  },
  handler: async ({ flags, colors }) => {
    const greeting = `Hello, ${flags.name}!`
    const message = flags.loud ? greeting.toUpperCase() : greeting
    
    for (let i = 0; i < flags.times; i++) {
      console.log(colors.cyan(message))
    }
  }
})

// Create and run the CLI
const cli = createCLI({
  name: 'greet',
  version: '1.0.0',
  description: 'A minimal Bunli CLI example'
})

cli.command(greetCommand)
await cli.run()