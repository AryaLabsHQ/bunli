import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '../../..')
const cliEntrypoint = path.join(repoRoot, 'packages/cli/src/cli.ts')
const tempBaseDir = path.join(repoRoot, '.tmp-bunli-doctor-e2e')

interface CliRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

async function runCli(cwd: string, args: string[]): Promise<CliRunResult> {
  const proc = Bun.spawn(['bun', cliEntrypoint, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  return { exitCode, stdout, stderr }
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
})
