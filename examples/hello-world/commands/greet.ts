import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

const greetCommand = defineCommand({
  name: 'greet' as const,
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

export default greetCommand

