import { afterEach, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { defineCommand } from '@bunli/core'
import { syncSkills } from '../src/sync.js'

const tempDirs: string[] = []
const originalHome = process.env.HOME
const originalXdgDataHome = process.env.XDG_DATA_HOME

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  process.env.HOME = originalHome
  process.env.XDG_DATA_HOME = originalXdgDataHome

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  }
})

function createCommands() {
  const hello = defineCommand({
    name: 'hello',
    description: 'Say hello',
    handler: async () => {}
  })

  return new Map([
    ['hello', hello]
  ])
}

test('syncSkills scopes staleness cache by local install target', async () => {
  const dataHome = makeTempDir('bunli-skills-data-')
  const cwdOne = makeTempDir('bunli-skills-one-')
  const cwdTwo = makeTempDir('bunli-skills-two-')

  process.env.XDG_DATA_HOME = dataHome

  const commands = createCommands()

  const first = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdOne,
    agents: []
  })
  const second = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdOne,
    agents: []
  })
  const third = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdTwo,
    agents: []
  })

  expect(first.updated).toBe(true)
  expect(second.updated).toBe(false)
  expect(third.updated).toBe(true)
  expect(fs.existsSync(path.join(cwdTwo, '.agents', 'skills', 'demo-cli', 'SKILL.md'))).toBe(true)
})

test('syncSkills honors force mode', async () => {
  const dataHome = makeTempDir('bunli-skills-force-data-')
  const cwd = makeTempDir('bunli-skills-force-')

  process.env.XDG_DATA_HOME = dataHome

  const commands = createCommands()

  const first = await syncSkills('demo cli', commands, {
    global: false,
    cwd,
    agents: []
  })
  const forced = await syncSkills('demo cli', commands, {
    global: false,
    cwd,
    force: true,
    agents: []
  })

  expect(first.updated).toBe(true)
  expect(forced.updated).toBe(true)
})
