import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import completionsDoctorCommand from '../src/commands/doctor/completions.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { testCommand } from '../../test/src/index.ts'
import { createTempFixtureDir, removeTempFixtureDir } from './helpers/temp-dir.js'

interface CliRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

async function runCli(cwd: string, args: string[]): Promise<CliRunResult> {
  const originalCwd = process.cwd()
  try {
    process.chdir(cwd)
    const normalizedArgs = args[0] === 'doctor' ? args.slice(1) : args
    if (normalizedArgs[0] !== 'completions') {
      throw new Error(`Unsupported test command: ${normalizedArgs.join(' ')}`)
    }

    const flags: Record<string, unknown> = {}
    if (normalizedArgs.includes('--strict')) {
      flags.strict = true
    }

    const generatedPathIndex = normalizedArgs.findIndex((value) => value === '--generatedPath')
    if (generatedPathIndex >= 0) {
      flags.generatedPath = normalizedArgs[generatedPathIndex + 1] ?? './.bunli/commands.gen.ts'
    }

    const result = await testCommand(completionsDoctorCommand, {
      flags,
      cwd,
    })

    return result
  } finally {
    process.chdir(originalCwd)
  }
}

function writeFixturePackageJson(fixtureDir: string) {
  writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({
    name: 'bunli-doctor-fixture',
    version: '0.0.0',
    type: 'module'
  }, null, 2))
}

function writeGeneratedModule(fixtureDir: string, entriesSource: string) {
  const generatedDir = path.join(fixtureDir, '.bunli')
  mkdirSync(generatedDir, { recursive: true })
  writeFileSync(path.join(generatedDir, 'commands.gen.ts'), `
export const generated = {
  list() {
    return ${entriesSource}
  }
}
`)
}

describe('doctor completions', () => {
  let fixtureDir = ''

  beforeEach(() => {
    fixtureDir = createTempFixtureDir('bunli-doctor-e2e')
    writeFixturePackageJson(fixtureDir)
  })

  afterEach(() => {
    if (fixtureDir) {
      removeTempFixtureDir(fixtureDir)
    }
  })

  test('passes with valid generated metadata', async () => {
    writeGeneratedModule(
      fixtureDir,
      `[{
  name: 'deploy',
  metadata: { name: 'deploy', description: 'Deploy app', options: {} }
}]`
    )

    const result = await runCli(fixtureDir, ['doctor', 'completions'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Completion protocol round-trip passed')
    expect(result.stdout).toContain('Loaded 1 generated command entries')
    expect(result.stderr).not.toContain('Error:')
  })

  test('warns but succeeds when generated metadata is empty', async () => {
    writeGeneratedModule(fixtureDir, '[]')

    const result = await runCli(fixtureDir, ['doctor', 'completions'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Completion protocol round-trip passed')
    expect(result.stdout).toContain('No commands found in generated metadata.')
    expect(result.stdout).toContain('Loaded 0 generated command entries')
  })

  test('fails in strict mode when warnings are present', async () => {
    writeGeneratedModule(fixtureDir, '[]')

    const result = await runCli(fixtureDir, ['doctor', 'completions', '--strict'])

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('No commands found in generated metadata.')
    expect(result.stderr).toContain('Strict mode enabled and warnings were found.')
  })

  test('fails when generated metadata contains duplicate command names', async () => {
    writeGeneratedModule(
      fixtureDir,
      `[{
  name: 'deploy',
  metadata: { name: 'deploy', description: 'Deploy one', options: {} }
}, {
  name: 'deploy',
  metadata: { name: 'deploy', description: 'Deploy two', options: {} }
}]`
    )

    const result = await runCli(fixtureDir, ['doctor', 'completions'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Duplicate command metadata name detected')
    expect(result.stderr).toContain('Completion metadata validation failed.')
  })

  test('passes strict mode for nested group metadata when children are protocol-reachable', async () => {
    writeGeneratedModule(
      fixtureDir,
      `[{
  name: 'config',
  metadata: {
    name: 'config',
    description: 'Config group',
    options: {},
    commands: [
      { name: 'init', description: 'Init config', options: {} },
      {
        name: 'profile',
        description: 'Profile group',
        options: {},
        commands: [
          { name: 'set', description: 'Set profile value', options: {} },
          { name: 'show', description: 'Show profile value', options: {} }
        ]
      }
    ]
  }
}, {
  name: 'status',
  metadata: { name: 'status', description: 'Status', options: {} }
}]`
    )

    const result = await runCli(fixtureDir, ['doctor', 'completions', '--strict'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Completion protocol round-trip passed')
    expect(result.stdout).toContain('Loaded 2 generated command entries')
    expect(result.stderr).not.toContain('Error:')
  })

  test('warns for nested child paths that do not resolve beneath their declared parent', async () => {
    writeGeneratedModule(
      fixtureDir,
      `[{
  name: 'config',
  metadata: {
    name: 'config',
    description: 'Config group',
    options: {},
    commands: [
      { name: 'other/init', description: 'Mismatched child path', options: {} }
    ]
  }
}]`
    )

    const nonStrict = await runCli(fixtureDir, ['doctor', 'completions'])
    expect(nonStrict.exitCode).toBe(0)
    expect(nonStrict.stdout).toContain('does not resolve beneath its parent path')

    const strict = await runCli(fixtureDir, ['doctor', 'completions', '--strict'])
    expect(strict.exitCode).toBe(1)
    expect(strict.stdout).toContain('does not resolve beneath its parent path')
    expect(strict.stderr).toContain('Strict mode enabled and warnings were found.')
  })
})
