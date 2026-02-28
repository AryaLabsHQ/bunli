import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import completionsDoctorCommand from '../src/commands/doctor/completions.js'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '../../..')
const tempBaseDir = path.join(repoRoot, '.tmp-bunli-doctor-e2e')

interface CliRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

async function runCli(cwd: string, args: string[]): Promise<CliRunResult> {
  const originalCwd = process.cwd()
  const stdout: string[] = []
  const stderr: string[] = []
  const originalLog = console.log
  const originalError = console.error

  console.log = (...parts: unknown[]) => stdout.push(parts.map(String).join(' '))
  console.error = (...parts: unknown[]) => stderr.push(parts.map(String).join(' '))

  let exitCode = 0
  try {
    process.chdir(cwd)
    const normalizedArgs = args[0] === 'doctor' ? args.slice(1) : args
    if (normalizedArgs[0] !== 'completions') {
      throw new Error(`Unsupported test command: ${normalizedArgs.join(' ')}`)
    }

    const strict = normalizedArgs.includes('--strict')
    const generatedPathIndex = normalizedArgs.findIndex((value) => value === '--generatedPath')
    const generatedPath = generatedPathIndex >= 0
      ? normalizedArgs[generatedPathIndex + 1] ?? './.bunli/commands.gen.ts'
      : './.bunli/commands.gen.ts'

    const commandLike = completionsDoctorCommand as unknown as {
      handler?: (args: {
        flags: { generatedPath: string, strict: boolean }
        colors: {
          green: (value: string) => string
          yellow: (value: string) => string
          red: (value: string) => string
        }
      }) => Promise<void>
    }

    if (typeof commandLike.handler !== 'function') {
      throw new Error('Doctor completions command is missing a handler.')
    }

    await commandLike.handler({
      flags: { generatedPath, strict },
      colors: {
        green: (value) => value,
        yellow: (value) => value,
        red: (value) => value
      }
    })
  } catch (error) {
    exitCode = 1
    const message = error instanceof Error ? error.message : String(error)
    stderr.push(`Error: ${message}`)
  } finally {
    process.chdir(originalCwd)
    console.log = originalLog
    console.error = originalError
  }

  return {
    exitCode,
    stdout: stdout.join('\n'),
    stderr: stderr.join('\n')
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
    mkdirSync(tempBaseDir, { recursive: true })
    fixtureDir = mkdtempSync(path.join(tempBaseDir, 'doctor-'))
    writeFixturePackageJson(fixtureDir)
  })

  afterEach(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true })
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
