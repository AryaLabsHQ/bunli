import { afterEach, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { defineCommand } from '@bunli/core'
import type { Agent } from '../src/agents.js'
import { syncSkills } from '../src/sync.js'

const tempDirs: string[] = []

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
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

function createRuntime(homeDir: string, dataHome: string) {
  return {
    homeDir: () => homeDir,
    dataHome: () => dataHome
  }
}

test('syncSkills scopes staleness cache by local install target', async () => {
  const dataHome = makeTempDir('bunli-skills-data-')
  const homeDir = makeTempDir('bunli-skills-home-')
  const cwdOne = makeTempDir('bunli-skills-one-')
  const cwdTwo = makeTempDir('bunli-skills-two-')
  const runtime = createRuntime(homeDir, dataHome)

  const commands = createCommands()

  const first = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdOne,
    agents: []
  }, runtime)
  const second = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdOne,
    agents: []
  }, runtime)
  const third = await syncSkills('demo cli', commands, {
    global: false,
    cwd: cwdTwo,
    agents: []
  }, runtime)

  expect(first.updated).toBe(true)
  expect(second.updated).toBe(false)
  expect(third.updated).toBe(true)
  expect(fs.existsSync(path.join(cwdTwo, '.agents', 'skills', 'demo-cli', 'SKILL.md'))).toBe(true)
})

test('syncSkills honors force mode', async () => {
  const dataHome = makeTempDir('bunli-skills-force-data-')
  const homeDir = makeTempDir('bunli-skills-force-home-')
  const cwd = makeTempDir('bunli-skills-force-')
  const runtime = createRuntime(homeDir, dataHome)

  const commands = createCommands()

  const first = await syncSkills('demo cli', commands, {
    global: false,
    cwd,
    agents: []
  }, runtime)
  const forced = await syncSkills('demo cli', commands, {
    global: false,
    cwd,
    force: true,
    agents: []
  }, runtime)

  expect(first.updated).toBe(true)
  expect(forced.updated).toBe(true)
})

test('syncSkills can sandbox global installs with an injected runtime home', async () => {
  const dataHome = makeTempDir('bunli-skills-global-data-')
  const homeDir = makeTempDir('bunli-skills-global-home-')
  const agentRoot = makeTempDir('bunli-skills-agent-root-')
  const runtime = createRuntime(homeDir, dataHome)

  const commands = createCommands()
  const universalAgent: Agent = {
    name: 'Custom Universal',
    globalSkillsDir: path.join(agentRoot, '.custom-agent', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => true
  }

  const result = await syncSkills('demo cli', commands, {
    global: true,
    agents: [universalAgent]
  }, runtime)

  expect(result.updated).toBe(true)
  expect(fs.existsSync(path.join(homeDir, '.agents', 'skills', 'demo-cli', 'SKILL.md'))).toBe(true)
  expect(fs.existsSync(path.join(agentRoot, '.custom-agent', 'skills', 'demo-cli', 'SKILL.md'))).toBe(true)
})

test('syncSkills reruns when the detected agent set changes', async () => {
  const dataHome = makeTempDir('bunli-skills-agent-data-')
  const homeDir = makeTempDir('bunli-skills-agent-home-')
  const agentRoot = makeTempDir('bunli-skills-agent-root-')
  const runtime = createRuntime(homeDir, dataHome)
  const commands = createCommands()

  const firstAgent: Agent = {
    name: 'First Agent',
    globalSkillsDir: path.join(agentRoot, '.first-agent', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => true
  }

  const secondAgent: Agent = {
    name: 'Second Agent',
    globalSkillsDir: path.join(agentRoot, '.second-agent', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => true
  }

  const first = await syncSkills('demo cli', commands, {
    global: true,
    agents: [firstAgent]
  }, runtime)

  const second = await syncSkills('demo cli', commands, {
    global: true,
    agents: [firstAgent, secondAgent]
  }, runtime)

  expect(first.updated).toBe(true)
  expect(second.updated).toBe(true)
  expect(fs.existsSync(path.join(agentRoot, '.second-agent', 'skills', 'demo-cli', 'SKILL.md'))).toBe(true)
})
