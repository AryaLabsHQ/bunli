import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'confirm',
  description: 'Ask a yes/no question',
  options: {
    default: option(z.boolean().optional().default(false), { description: 'Default value' }),
    affirmative: option(z.string().optional().default('Yes'), { description: 'Affirmative label' }),
    negative: option(z.string().optional().default('No'), { description: 'Negative label' }),
    timeout: option(z.number().optional(), { short: 't', description: 'Timeout in seconds' }),
  },
  async handler({ flags, positional, prompt }) {
    const message = positional[0] ?? 'Are you sure?'
    const result = await prompt.confirm(message, {
      default: flags.default,
      affirmativeLabel: flags.affirmative,
      negativeLabel: flags.negative,
      timeout: flags.timeout,
    })
    process.exit(result ? 0 : 1)
  }
})
