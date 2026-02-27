import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '../../..')
const cliEntrypoint = path.join(repoRoot, 'packages/cli/src/cli.ts')
const tempBaseDir = path.join(repoRoot, '.tmp-bunli-dev-e2e')

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

function writeBaseFixture(fixtureDir: string, configContents: string) {
  writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({
    name: 'bunli-dev-e2e-fixture',
    version: '0.0.0',
    type: 'module',
  }, null, 2))

  writeFileSync(path.join(fixtureDir, 'bunli.config.ts'), configContents)
  writeFileSync(path.join(fixtureDir, 'cli.ts'), "console.log('fixture cli entry')\n")
}

function writeCommandFile(baseDir: string, commandFile: string, commandName: string) {
  const fullDir = path.join(baseDir, commandFile)
  mkdirSync(path.dirname(fullDir), { recursive: true })
  writeFileSync(fullDir, `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: '${commandName}',
  description: '${commandName} command',
  handler: () => {}
})
`)
}

describe('dev e2e - commandsDir precedence', () => {
  let fixtureDir = ''

  beforeEach(() => {
    mkdirSync(tempBaseDir, { recursive: true })
    fixtureDir = mkdtempSync(path.join(tempBaseDir, 'dev-'))
  })

  afterEach(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  test('uses config.commands.directory when --commandsDir is not provided', async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './cli.ts' },
  commands: { directory: './src/commands' }
}\n`
    )
    writeCommandFile(fixtureDir, 'src/commands/from-config.ts', 'from-config')

    const result = await runCli(fixtureDir, ['dev', '--watch=false'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`
    const generatedPath = path.join(fixtureDir, '.bunli/commands.gen.ts')

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Types generated')
    expect(combinedOutput).toContain('Generated types for 1 commands')
    expect(existsSync(generatedPath)).toBe(true)
    expect(readFileSync(generatedPath, 'utf8')).toContain("'from-config'")
  })

  test('uses --commandsDir value over config.commands.directory', async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './cli.ts' },
  commands: { directory: './src/commands' }
}\n`
    )
    writeCommandFile(fixtureDir, 'src/commands/from-config.ts', 'from-config')
    writeCommandFile(fixtureDir, 'custom/commands/from-flag.ts', 'from-flag')

    const result = await runCli(fixtureDir, ['dev', '--watch=false', '--commandsDir=custom/commands'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`
    const generatedPath = path.join(fixtureDir, '.bunli/commands.gen.ts')
    const generated = readFileSync(generatedPath, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Types generated')
    expect(combinedOutput).toContain('Generated types for 1 commands')
    expect(generated).toContain("'from-flag'")
    expect(generated).not.toContain("'from-config'")
  })

  test('falls back to ./commands when neither flag nor config directory is set', async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './cli.ts' }
}\n`
    )
    writeCommandFile(fixtureDir, 'commands/from-default.ts', 'from-default')

    const result = await runCli(fixtureDir, ['dev', '--watch=false'])
    const combinedOutput = `${result.stdout}\n${result.stderr}`
    const generatedPath = path.join(fixtureDir, '.bunli/commands.gen.ts')

    expect(result.exitCode).toBe(0)
    expect(combinedOutput).toContain('Types generated')
    expect(combinedOutput).toContain('Generated types for 1 commands')
    expect(existsSync(generatedPath)).toBe(true)
    expect(readFileSync(generatedPath, 'utf8')).toContain("'from-default'")
  })
})
