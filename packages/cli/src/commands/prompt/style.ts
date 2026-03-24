import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'style',
  description: 'Apply styling to text',
  options: {
    foreground: option(z.string().optional(), { description: 'Foreground color' }),
    background: option(z.string().optional(), { description: 'Background color' }),
    bold: option(z.boolean().optional(), { description: 'Bold text' }),
    italic: option(z.boolean().optional(), { description: 'Italic text' }),
    underline: option(z.boolean().optional(), { description: 'Underline text' }),
    strikethrough: option(z.boolean().optional(), { description: 'Strikethrough text' }),
    width: option(z.number().optional(), { description: 'Width' }),
    align: option(z.string().optional(), { description: 'Alignment (left, center, right)' }),
  },
  async handler({ flags, positional, colors }) {
    let text = positional.length > 0 ? positional.join(' ') : undefined
    if (!text) {
      const { readStdinLines } = await import('@bunli/tui')
      const lines = await readStdinLines()
      text = lines.join('\n')
    }
    if (!text) {
      process.stderr.write('Error: no text provided\n')
      process.exit(1)
      return
    }

    let result = text

    // Apply ANSI styling using the colors utility
    if (flags.bold) result = colors.bold(result)
    if (flags.italic) result = colors.italic(result)
    if (flags.underline) result = colors.underline(result)
    if (flags.strikethrough) result = colors.strikethrough(result)
    if (flags.foreground) {
      const colorFn = (colors as Record<string, ((s: string) => string) | undefined>)[flags.foreground]
      if (typeof colorFn === 'function') {
        result = colorFn(result)
      }
    }

    const { writeStdout } = await import('@bunli/tui')
    writeStdout(result)
  }
})
