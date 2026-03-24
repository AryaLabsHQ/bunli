import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'join',
  description: 'Join text blocks together',
  options: {
    horizontal: option(z.boolean().optional().default(false), { description: 'Join horizontally' }),
    separator: option(z.string().optional().default(''), { description: 'Separator between blocks' }),
    align: option(z.string().optional().default('left'), { description: 'Alignment (left, center, right)' }),
  },
  async handler({ flags, positional }) {
    let blocks: string[]

    if (positional.length > 0) {
      blocks = positional
    } else {
      const { readStdinLines } = await import('@bunli/tui')
      const lines = await readStdinLines()
      // Split blocks on "---" delimiter
      const raw = lines.join('\n')
      blocks = raw.split('---').map(b => b.trim()).filter(Boolean)
    }

    if (blocks.length === 0) {
      return
    }

    const sep = flags.separator
    let output: string

    if (flags.horizontal) {
      // Join blocks side by side
      const blockLines = blocks.map(b => b.split('\n'))
      const maxLines = Math.max(...blockLines.map(bl => bl.length))
      const maxWidths = blockLines.map(bl => Math.max(...bl.map(l => l.length), 0))
      const rows: string[] = []
      for (let i = 0; i < maxLines; i++) {
        const parts = blockLines.map((bl, idx) => {
          const line = bl[i] ?? ''
          return line.padEnd(maxWidths[idx] ?? 0)
        })
        rows.push(parts.join(sep))
      }
      output = rows.join('\n')
    } else {
      output = blocks.join(sep ? `\n${sep}\n` : '\n')
    }

    const { writeStdout } = await import('@bunli/tui')
    writeStdout(output)
  }
})
