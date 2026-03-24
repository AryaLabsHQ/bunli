import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'input',
  description: 'Prompt for single-line text input',
  options: {
    placeholder: option(z.string().optional(), { description: 'Placeholder text' }),
    prompt: option(z.string().optional(), { description: 'Prompt message' }),
    value: option(z.string().optional(), { description: 'Default value' }),
    'char-limit': option(z.number().optional(), { description: 'Character limit' }),
  },
  async handler({ flags, positional, prompt }) {
    const message = positional[0] ?? flags.prompt ?? 'Input'
    const result = await prompt.text(message, {
      default: flags.value,
      placeholder: flags.placeholder,
    })
    const { writeStdout } = await import('@bunli/tui')
    writeStdout(result)
  }
})
