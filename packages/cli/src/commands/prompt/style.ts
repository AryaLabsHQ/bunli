import { defineCommand, option } from '@bunli/core'
import { styled } from '@bunli/tui'
import { readStdinLines, writeStdout } from '@bunli/utils'
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
  async handler({ flags, positional }) {
    let text = positional.length > 0 ? positional.join(' ') : undefined
    if (!text) {
      const lines = await readStdinLines()
      text = lines.join('\n')
    }
    if (!text) {
      process.stderr.write('Error: no text provided\n')
      process.exit(1)
      return
    }

    let builder = styled()

    if (flags.bold) builder = builder.bold()
    if (flags.italic) builder = builder.italic()
    if (flags.underline) builder = builder.underline()
    if (flags.strikethrough) builder = builder.strikethrough()
    if (flags.foreground) builder = builder.foreground(flags.foreground)
    if (flags.background) builder = builder.background(flags.background)
    if (flags.width) builder = builder.width(flags.width)
    if (flags.align === 'left' || flags.align === 'center' || flags.align === 'right') {
      builder = builder.align(flags.align)
    }

    writeStdout(builder.render(text))
  }
})
