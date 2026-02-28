import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

describe('release-prepare prompt API usage', () => {
  test('uses @bunli/tui prompt positional call signatures', async () => {
    const file = join(process.cwd(), 'scripts', 'release-prepare.ts')
    const source = await readFile(file, 'utf8')

    expect(source.includes('p.confirm({')).toBe(false)
    expect(source.includes('p.multiselect({')).toBe(false)
    expect(source.includes("p.confirm('Working tree is not clean. Continue anyway?',")).toBe(true)
    expect(source.includes("p.confirm('Create a PR with this changeset?',")).toBe(true)
    expect(source.includes("p.multiselect('Select packages to include in the changeset',")).toBe(true)
    expect(source.includes('Manual prompt UX smoke checklist:')).toBe(true)
  })
})
