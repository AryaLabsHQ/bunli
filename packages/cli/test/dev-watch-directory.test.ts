import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import { resolveWatchDirectory } from '../src/commands/dev.js'

const repoRoot = path.resolve(import.meta.dir, '../../..')
const tempBaseDir = path.join(repoRoot, '.tmp-bunli-dev-watch')

describe('resolveWatchDirectory', () => {
  const originalCwd = process.cwd()
  let fixtureDir = ''

  beforeEach(() => {
    mkdirSync(tempBaseDir, { recursive: true })
    fixtureDir = mkdtempSync(path.join(tempBaseDir, 'watch-'))
    process.chdir(fixtureDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  test('prefers configured commands.directory', () => {
    mkdirSync(path.join(fixtureDir, 'custom', 'commands'), { recursive: true })
    const entryPath = path.join(fixtureDir, 'cli.ts')

    const resolved = resolveWatchDirectory(entryPath, './custom/commands')

    expect(resolved).toBe(path.join(fixtureDir, 'custom', 'commands'))
  })

  test('falls back to ./commands for root-level entry files', () => {
    mkdirSync(path.join(fixtureDir, 'commands'), { recursive: true })
    const entryPath = path.join(fixtureDir, 'cli.ts')

    const resolved = resolveWatchDirectory(entryPath)

    expect(resolved).toBe(path.join(fixtureDir, 'commands'))
  })

  test('falls back to ./src/commands when ./commands is absent', () => {
    mkdirSync(path.join(fixtureDir, 'src', 'commands'), { recursive: true })
    const entryPath = path.join(fixtureDir, 'cli.ts')

    const resolved = resolveWatchDirectory(entryPath)

    expect(resolved).toBe(path.join(fixtureDir, 'src', 'commands'))
  })

  test('falls back to ./src when entry is root-level and commands directories are absent', () => {
    mkdirSync(path.join(fixtureDir, 'src'), { recursive: true })
    const entryPath = path.join(fixtureDir, 'cli.ts')

    const resolved = resolveWatchDirectory(entryPath)

    expect(resolved).toBe(path.join(fixtureDir, 'src'))
  })

  test('returns entry directory when entry is nested and no other defaults exist', () => {
    mkdirSync(path.join(fixtureDir, 'app', 'cli'), { recursive: true })
    const entryPath = path.join(fixtureDir, 'app', 'cli', 'entry.ts')

    const resolved = resolveWatchDirectory(entryPath)

    expect(resolved).toBe(path.join(fixtureDir, 'app', 'cli'))
  })

  test('returns null when no safe fallback directory exists', () => {
    const entryPath = path.join(fixtureDir, 'cli.ts')

    const resolved = resolveWatchDirectory(entryPath)

    expect(resolved).toBeNull()
  })
})
