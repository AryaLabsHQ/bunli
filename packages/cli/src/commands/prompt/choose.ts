import { defineCommand, defineOption } from '@bunli/core'
import { readStdinLines, writeStdout, writeStdoutLines } from '@bunli/utils'
import { z } from 'zod'

export default defineCommand({
  name: 'choose',
  description: 'Choose from a list of options',
  options: {
    multiple: defineOption(z.boolean().optional().default(false), { description: 'Allow multiple selections', argumentKind: 'flag' }),
    limit: defineOption(z.number().optional(), { description: 'Max selections' }),
    height: defineOption(z.number().optional().default(10), { description: 'Visible items' }),
    ordered: defineOption(z.boolean().optional().default(false), { description: 'Maintain selection order', argumentKind: 'flag' }),
  },
  async handler({ flags, positional, prompt }) {
    let items = positional.length > 0 ? positional : []
    if (items.length === 0) {
      items = await readStdinLines()
    }
    if (items.length === 0) {
      process.stderr.write('Error: no items provided\n')
      process.exit(1)
    }

    const options = items.map(item => ({ label: item, value: item }))

    if (flags.multiple) {
      const selected = await prompt.multiselect('Choose', {
        options,
        max: flags.limit,
        ordered: flags.ordered,
        height: flags.height,
      })
      writeStdoutLines(selected)
    } else {
      const selected = await prompt.select('Choose', { options })
      writeStdout(selected)
    }
  }
})
