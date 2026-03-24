import { expect, test } from 'bun:test'
import { defineCommand } from '@bunli/core'
import { createTestCLI } from '../src/index.js'

test('createTestCLI captures direct stdout writes from output()', async () => {
  const emitCommand = defineCommand({
    name: 'emit',
    description: 'Emit structured output',
    async handler({ output }) {
      output({
        ok: true,
        value: 42
      })
    }
  })

  const testCli = await createTestCLI({
    commands: [emitCommand]
  })

  const result = await testCli.run(['emit', '--format', 'json'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('"ok": true')
  expect(result.stdout).toContain('"value": 42')
})
