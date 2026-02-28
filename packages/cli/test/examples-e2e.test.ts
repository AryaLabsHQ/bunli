import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '../../..')
const cliEntrypoint = path.join(repoRoot, 'packages/cli/src/cli.ts')
const taskRunnerExample = path.join(repoRoot, 'examples/task-runner')
const tempBaseDir = path.join(repoRoot, '.tmp-bunli-e2e')

interface CliRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

function forceBundleMode(configPath: string) {
  const current = readFileSync(configPath, 'utf8')
  if (!current.includes("targets: ['native']")) {
    throw new Error(`Could not find targets:['native'] in ${configPath}`)
  }
  const updated = current.replace("targets: ['native']", 'targets: []')
  writeFileSync(configPath, updated)
}

function forceMultiEntryBundleMode(configPath: string) {
  const current = readFileSync(configPath, 'utf8')
  const target = "build: {\n    entry: './cli.ts',"
  if (!current.includes(target)) {
    throw new Error(`Could not find build.entry in ${configPath}`)
  }
  const withMultiEntry = current.replace(
    target,
    "build: {\n    entry: ['./cli.ts', './secondary.ts'],"
  )
  writeFileSync(configPath, withMultiEntry)
}

async function initGitRepository(cwd: string) {
  await Bun.$`git init ${cwd}`.quiet()
  await Bun.$`git -C ${cwd} config user.email "test@example.com"`.quiet()
  await Bun.$`git -C ${cwd} config user.name "Test User"`.quiet()
  await Bun.$`git -C ${cwd} add .`.quiet()
  await Bun.$`git -C ${cwd} commit -m "init fixture"`.quiet()
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

describe('example e2e: task-runner with build.targets=[]', () => {
  let fixtureDir = ''

  beforeEach(async () => {
    mkdirSync(tempBaseDir, { recursive: true })
    fixtureDir = mkdtempSync(path.join(tempBaseDir, 'task-runner-'))
    cpSync(taskRunnerExample, fixtureDir, {
      recursive: true,
      filter: (source) => !source.split(path.sep).includes('node_modules'),
    })
    forceBundleMode(path.join(fixtureDir, 'bunli.config.ts'))
    await initGitRepository(fixtureDir)
  })

  afterEach(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  test('bunli build succeeds and outputs JS bundle', async () => {
    const result = await runCli(fixtureDir, ['build'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Build complete')

    const bundlePath = path.join(fixtureDir, 'dist/cli.js')
    expect(existsSync(bundlePath)).toBe(true)

    const bundle = readFileSync(bundlePath, 'utf8')
    expect(bundle.startsWith('#!/usr/bin/env bun')).toBe(true)
  })

  test('bunli build preserves multi-entry build.entry arrays in bundle mode', async () => {
    forceMultiEntryBundleMode(path.join(fixtureDir, 'bunli.config.ts'))
    writeFileSync(path.join(fixtureDir, 'secondary.ts'), "console.log('secondary entry')\n")

    const result = await runCli(fixtureDir, ['build'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Build complete')
    expect(existsSync(path.join(fixtureDir, 'dist/cli.js'))).toBe(true)
    expect(existsSync(path.join(fixtureDir, 'dist/secondary.js'))).toBe(true)
  })

  test('bunli release --dry stays in non-binary flow', async () => {
    const result = await runCli(fixtureDir, ['release', '--dry', '--version=patch', '--npm=false'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Releasing @bunli-examples/task-runner')
    expect(combinedOutput).toContain('Building project')
    expect(combinedOutput).not.toContain('Publishing platform packages')
  })

  test('bunli release rejects --no-npm flag form', async () => {
    const result = await runCli(fixtureDir, ['release', '--dry', '--version=patch', '--no-npm'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(1)
    expect(combinedOutput).toContain('Unsupported flags: --no-npm')
    expect(combinedOutput).toContain('Use --npm=false')
  })

  test('bunli release --all exits with explicit not-implemented error', async () => {
    const result = await runCli(fixtureDir, ['release', '--dry', '--version=patch', '--all'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`

    expect(result.exitCode).toBe(1)
    expect(combinedOutput).toContain('Workspace release (--all) is not implemented yet')
  })
})
