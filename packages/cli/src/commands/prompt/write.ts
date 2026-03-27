import { defineCommand, defineOption } from '@bunli/core'
import { writeStdout } from '@bunli/utils'
import { z } from 'zod'

export default defineCommand({
  name: 'write',
  description: 'Prompt for multi-line text input',
  options: {
    placeholder: defineOption(z.string().optional(), { description: 'Placeholder text' }),
    value: defineOption(z.string().optional(), { description: 'Default value' }),
    'char-limit': defineOption(z.number().optional(), { description: 'Character limit' }),
    height: defineOption(z.number().optional(), { description: 'Editor height' }),
  },
  async handler({ flags, positional, prompt }) {
    const message = positional[0] ?? 'Write'
    const result = await prompt.text(message, {
      default: flags.value,
      placeholder: flags.placeholder,
      multiline: true,
      charLimit: flags['char-limit'],
      height: flags.height,
    })
    writeStdout(result)
  }
})
