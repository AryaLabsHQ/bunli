import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createCLI } from '@bunli/core'
import { completionsPlugin } from '../src/index.js'
import { resolve } from 'node:path'
import type { CompletionsPluginOptions } from '../src/types.js'

const EXAMPLE_DIR = resolve(import.meta.dir, '../../../examples/task-runner')
const SHELLS = ['bash', 'zsh', 'fish', 'powershell'] as const

async function createTestCLI(overrides: CompletionsPluginOptions = {}) {
  return createCLI({
    name: 'my-cli',
    version: '1.0.0',
    plugins: [
      completionsPlugin({
        commandName: 'my-cli',
        executable: 'my-cli',
        ...overrides
      })
    ] as const
  })
}

function captureConsole() {
  const stdout: string[] = []
  const stderr: string[] = []

  const originalLog = console.log
  const originalError = console.error

  console.log = (...args: unknown[]) => stdout.push(args.map(String).join(' '))
  console.error = (...args: unknown[]) => stderr.push(args.map(String).join(' '))

  return {
    restore() {
      console.log = originalLog
      console.error = originalError
    },
    stdout() {
      return stdout.join('\n')
    },
    stderr() {
      return stderr.join('\n')
    }
  }
}

describe('completions/complete command (Tab protocol)', () => {
  let cwd: string

  beforeEach(() => {
    cwd = process.cwd()
    process.chdir(EXAMPLE_DIR)
  })

  afterEach(() => {
    process.chdir(cwd)
  })

  for (const shell of SHELLS) {
    test(`completions ${shell} outputs a script that calls back into \`complete --\``, async () => {
      const cli = await createTestCLI()

      const cap = captureConsole()
      try {
        await cli.run(['completions', shell])
      } finally {
        cap.restore()
      }

      expect(cap.stdout()).toMatch(/complete\s+['"]?--['"]?/)
    })
  }

  test('protocol output ends with a :N directive line', async () => {
    const cli = await createTestCLI()

    const cap = captureConsole()
    try {
      // Tab scripts call `complete -- ...`, so that alias must exist.
      await cli.run(['complete', '--', 'deploy'])
    } finally {
      cap.restore()
    }

    const lines = cap.stdout().trim().split('\n')
    const last = lines[lines.length - 1] ?? ''
    expect(last).toMatch(/^:\d+$/)
  })

  test('completions without shell shows usage guidance instead of protocol output', async () => {
    const cli = await createTestCLI()

    const cap = captureConsole()
    try {
      await cli.run(['completions'])
    } finally {
      cap.restore()
    }

    expect(cap.stderr()).toContain('Missing or invalid shell name')
    expect(cap.stderr()).toContain('completions <bash|zsh|fish|powershell>')
    expect(cap.stdout().trim()).toBe('')
  })

  test('matched command includes both global and command-specific flags', async () => {
    const cli = await createTestCLI()

    const cap = captureConsole()
    try {
      await cli.run(['complete', '--', 'deploy', '--'])
    } finally {
      cap.restore()
    }

    const output = cap.stdout()
    expect(output).toContain('--help')
    expect(output).toContain('--environment')
    const last = output.trim().split('\n').at(-1) ?? ''
    expect(last).toMatch(/^:\d+$/)
  })

  test('enum-valued options return value candidates via option handlers', async () => {
    const cli = await createTestCLI()

    const cap = captureConsole()
    try {
      await cli.run(['complete', '--', 'deploy', '--environment', ''])
    } finally {
      cap.restore()
    }

    const output = cap.stdout()
    expect(output).toContain('development\t')
    expect(output).toContain('staging\t')
    expect(output).toContain('production\t')
    const last = output.trim().split('\n').at(-1) ?? ''
    expect(last).toMatch(/^:\d+$/)
  })

  test('ends-with-space sentinel is preserved via runtime.args (trailing empty string)', async () => {
    const cli = await createTestCLI()

    const cap = captureConsole()
    try {
      await cli.run(['complete', '--', 'deploy', ''])
    } finally {
      cap.restore()
    }

    const out = cap.stdout().trim()
    // When Tab sees the trailing '', it treats it as "ends with space" and should not suggest "deploy" itself.
    expect(out).not.toContain('deploy\t')
    expect(out).toMatch(/^:\d+$/)
  })

  test('task-runner example works end-to-end for completions zsh', async () => {
    const proc = Bun.spawn({
      cmd: ['bun', 'cli.ts', 'completions', 'zsh'],
      cwd: EXAMPLE_DIR,
      stdout: 'pipe',
      stderr: 'pipe'
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const code = await proc.exited

    expect(code).toBe(0)
    expect(stderr.trim()).toBe('')
    expect(stdout).toContain('complete --')
  })

  test('missing generated metadata returns :1 directive without stack trace', async () => {
    const cli = await createTestCLI({ generatedPath: '.bunli/does-not-exist.ts' })
    const cap = captureConsole()

    try {
      await cli.run(['complete', '--', 'deploy'])
    } finally {
      cap.restore()
    }

    expect(cap.stdout().trim()).toBe(':1')
    expect(cap.stderr().trim()).toBe('')
  })
})
