import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Say hello to someone',
  options: {
    name: option(
      z.string().default('World'),
      { 
        description: 'Name to greet',
        short: 'n'
      }
    ),
    excited: option(
      z.boolean().default(false),
      {
        description: 'Add excitement!',
        short: 'e'
      }
    )
  },
  handler: async ({ flags, colors }) => {
    const greeting = `Hello, ${flags.name}`
    const message = flags.excited ? `${greeting}!` : `${greeting}.`
    
    console.log(colors.green(message))
  }
})