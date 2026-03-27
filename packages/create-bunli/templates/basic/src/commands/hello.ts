import { defineCommand, defineOption } from '@bunli/core'
import { z } from 'zod'

const helloCommand = defineCommand({
  name: 'hello',
  description: 'Say hello to someone',
  options: {
    name: defineOption(
      z.string().default('World'),
      { 
        description: 'Name to greet',
        short: 'n'
      }
    ),
    excited: defineOption(
      z.boolean().default(false),
      {
        description: 'Add excitement!',
        short: 'e',
        argumentKind: 'flag'
      }
    )
  },
  handler: async ({ flags, colors }) => {
    const greeting = `Hello, ${flags.name}`
    const message = flags.excited ? `${greeting}!` : `${greeting}.`
    
    console.log(colors.green(message))
  }
})

export default helloCommand
