import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createCLI } from '@bunli/core'
import { completionsPlugin } from '../src/index.js'
import { resolve } from 'node:path'

const EXAMPLE_DIR = resolve(import.meta.dir, '../../../examples/task-runner')

function captureConsole() {
  const stdout: string[] = []
  const stderr: string[] = []

  const originalLog = console.log
  const originalError = console.error

  console.log = (...args: any[]) => stdout.push(args.join(' '))
  console.error = (...args: any[]) => stderr.push(args.join(' '))

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

  test('completions zsh outputs a script that calls back into `complete --`', async () => {
    const cli = await createCLI({
      name: 'my-cli',
      version: '1.0.0',
      plugins: [
        completionsPlugin({
          commandName: 'my-cli',
          executable: 'my-cli'
        })
      ] as const
    })

    const cap = captureConsole()
    try {
      await cli.run(['completions', 'zsh'])
    } finally {
      cap.restore()
    }

    expect(cap.stdout()).toContain('complete --')
  })

  test('protocol output ends with a :N directive line', async () => {
    const cli = await createCLI({
      name: 'my-cli',
      version: '1.0.0',
      plugins: [
        completionsPlugin({
          commandName: 'my-cli',
          executable: 'my-cli'
        })
      ] as const
    })

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

  test('ends-with-space sentinel is preserved via runtime.args (trailing empty string)', async () => {
    const cli = await createCLI({
      name: 'my-cli',
      version: '1.0.0',
      plugins: [
        completionsPlugin({
          commandName: 'my-cli',
          executable: 'my-cli'
        })
      ] as const
    })

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
})
