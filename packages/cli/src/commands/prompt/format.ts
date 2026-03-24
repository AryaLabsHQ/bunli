import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'format',
  description: 'Format text output',
  options: {
    type: option(z.enum(['markdown', 'code', 'emoji', 'template']).optional().default('markdown'), {
      description: 'Format type',
    }),
    language: option(z.string().optional(), { description: 'Language for code formatting' }),
  },
  async handler({ flags, positional }) {
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

    let output = text

    switch (flags.type) {
      case 'code': {
        const lang = flags.language ?? ''
        output = `\`\`\`${lang}\n${text}\n\`\`\``
        break
      }
      case 'template': {
        // Simple {{VAR}} replacement from env
        output = text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
          return process.env[name] ?? `{{${name}}}`
        })
        break
      }
      case 'emoji':
      case 'markdown':
      default:
        // Pass through as-is for markdown and emoji
        break
    }

    const { writeStdout } = await import('@bunli/tui')
    writeStdout(output)
  }
})
