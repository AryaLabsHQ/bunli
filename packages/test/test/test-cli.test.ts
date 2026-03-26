import { expect, test } from 'bun:test'
import { defineCommand, option } from '@bunli/core'
import { createTestCLI } from '../src/index.js'
import { z } from 'zod'

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

test('createTestCLI forwards options-only execute calls', async () => {
  const greetCommand = defineCommand({
    name: 'greet',
    description: 'Greet someone',
    options: {
      name: option(z.string().default('World'))
    },
    async handler({ flags }) {
      console.log(`Hello, ${flags.name}!`)
    }
  })

  const testCli = await createTestCLI({
    commands: [greetCommand]
  })

  const result = await testCli.execute('greet', undefined, { name: 'Saatvik' })

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('Hello, Saatvik!')
})
