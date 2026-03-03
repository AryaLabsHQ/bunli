import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function collectCommandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectCommandFiles(fullPath)))
      continue
    }

    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

describe('render lifecycle guard', () => {
  test('example commands with render() do not call process.exit directly', async () => {
    const commandsRoot = join(process.cwd(), 'examples')
    const files = await collectCommandFiles(commandsRoot)
    const violations: string[] = []

    for (const file of files) {
      if (!file.includes('/commands/')) continue
      const source = await readFile(file, 'utf8')
      if (!source.includes('render:')) continue
      if (!source.includes('process.exit(')) continue
      violations.push(file)
    }

    expect(violations).toEqual([])
  })
})
