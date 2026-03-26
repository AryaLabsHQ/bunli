import { defineCommand, option } from '@bunli/core'
import { writeStdout } from '@bunli/utils'
import { z } from 'zod'
import { readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

export default defineCommand({
  name: 'file',
  description: 'Pick a file or directory',
  options: {
    path: option(z.string().optional().default('.'), { description: 'Starting directory' }),
    files: option(z.boolean().optional().default(true), { description: 'Show files' }),
    directories: option(z.boolean().optional().default(true), { description: 'Show directories' }),
    hidden: option(z.boolean().optional().default(false), { description: 'Show hidden files' }),
    extensions: option(z.string().optional(), { description: 'Filter by extensions (comma-separated)' }),
  },
  async handler({ flags, prompt }) {
    const dir = resolve(flags.path)
    const allowedExtensions = flags.extensions
      ? flags.extensions.split(',').map(e => e.trim().replace(/^\./, ''))
      : undefined

    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      process.stderr.write(`Error: cannot read directory: ${dir}\n`)
      process.exit(1)
      return
    }

    const items: string[] = []
    for (const entry of entries) {
      if (!flags.hidden && entry.startsWith('.')) continue

      const fullPath = join(dir, entry)
      let isDir = false
      try {
        isDir = statSync(fullPath).isDirectory()
      } catch {
        continue
      }

      if (isDir && !flags.directories) continue
      if (!isDir && !flags.files) continue

      if (!isDir && allowedExtensions) {
        const ext = entry.split('.').pop() ?? ''
        if (!allowedExtensions.includes(ext)) continue
      }

      items.push(isDir ? `${entry}/` : entry)
    }

    if (items.length === 0) {
      process.stderr.write('Error: no matching files found\n')
      process.exit(1)
      return
    }

    const options = items.map(item => ({ label: item, value: item }))
    const selected = await prompt.select('Select file', { options })
    const result = selected.endsWith('/')
      ? join(dir, selected.slice(0, -1))
      : join(dir, selected)
    writeStdout(result)
  }
})
