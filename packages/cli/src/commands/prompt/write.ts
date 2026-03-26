import { defineCommand, option } from '@bunli/core'
import { writeStdout } from '@bunli/utils'
import { z } from 'zod'

export default defineCommand({
  name: 'write',
  description: 'Prompt for multi-line text input',
  options: {
    placeholder: option(z.string().optional(), { description: 'Placeholder text' }),
    value: option(z.string().optional(), { description: 'Default value' }),
    'char-limit': option(z.number().optional(), { description: 'Character limit' }),
    height: option(z.number().optional(), { description: 'Editor height' }),
  },
  async handler({ flags, positional, prompt }) {
    const message = positional[0] ?? 'Write'
    const result = await prompt.text(message, {
      default: flags.value,
      placeholder: flags.placeholder,
      multiline: true,
    })
    writeStdout(result)
  }
})
