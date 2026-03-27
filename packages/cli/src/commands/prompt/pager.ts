import { defineCommand, defineOption } from '@bunli/core'
import { readStdinLines } from '@bunli/utils'
import { z } from 'zod'

export default defineCommand({
  name: 'pager',
  description: 'View content in a scrollable pager',
  options: {
    file: defineOption(z.string().optional(), { short: 'f', description: 'File to display' }),
  },
  async handler({ flags, prompt }) {
    let content: string | undefined

    if (flags.file) {
      const file = Bun.file(flags.file)
      if (!(await file.exists())) {
        process.stderr.write(`Error: file not found: ${flags.file}\n`)
        process.exit(1)
      }
      content = await file.text()
    } else {
      const lines = await readStdinLines()
      if (lines.length > 0) {
        content = lines.join('\n')
      }
    }

    if (content === undefined) {
      process.stderr.write('Error: no content provided (use --file or pipe via stdin)\n')
      process.exit(1)
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stdout.write(content)
      if (!content.endsWith('\n')) {
        process.stdout.write('\n')
      }
      return
    }

    await prompt.pager(content, { title: flags.file ?? 'Pager' })
  }
})
