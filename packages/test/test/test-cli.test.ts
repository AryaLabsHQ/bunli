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

test('createTestCLI formats version output for machine-readable consumers', async () => {
  const testCli = await createTestCLI({
    name: 'format-cli',
    version: '2.3.4'
  })

  const result = await testCli.run(['--format', 'json', '--version'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('"type": "version"')
  expect(result.stdout).toContain('"name": "format-cli"')
  expect(result.stdout).toContain('"version": "2.3.4"')
})

test('createTestCLI formats help output for machine-readable consumers', async () => {
  const greetCommand = defineCommand({
    name: 'greet',
    description: 'Greet someone',
    handler: async () => {}
  })

  const testCli = await createTestCLI({
    commands: [greetCommand]
  })

  const result = await testCli.run(['--format', 'yaml', '--help'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('type: help')
  expect(result.stdout).toContain('text:')
})

test('createTestCLI formats unknown-command errors for machine-readable consumers', async () => {
  const testCli = await createTestCLI()

  const result = await testCli.run(['--format', 'json', 'grete'])

  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('"ok": false')
  expect(result.stderr).toContain('"name": "CommandNotFoundError"')
  expect(result.stderr).toContain('"command": "grete"')
})

test('createTestCLI formats validation errors for machine-readable consumers', async () => {
  const countCommand = defineCommand({
    name: 'count',
    description: 'Count things',
    options: {
      total: option(z.coerce.number().int().min(1), { short: 't' })
    },
    async handler() {}
  })

  const testCli = await createTestCLI({
    commands: [countCommand]
  })

  const result = await testCli.run(['count', '--format', 'json', '--total', 'abc'])

  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('"ok": false')
  expect(result.stderr).toContain('"name": "BunliValidationError"')
  expect(result.stderr).toContain('"option": "total"')
})

test('createTestCLI allows command-local format flags to shadow the global format flag', async () => {
  const processCommand = defineCommand({
    name: 'process',
    description: 'Process files',
    options: {
      format: option(z.enum(['json', 'yaml', 'text']).default('json'))
    },
    async handler({ flags }) {
      console.log(flags.format)
    }
  })

  const testCli = await createTestCLI({
    commands: [processCommand]
  })

  const result = await testCli.run(['process', '--format', 'text'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('text')
})

test('createTestCLI preserves global --format for built-in help on commands with local format options', async () => {
  const processCommand = defineCommand({
    name: 'process',
    description: 'Process files',
    options: {
      format: option(z.enum(['json', 'yaml', 'text']).default('json'))
    },
    async handler() {}
  })

  const testCli = await createTestCLI({
    commands: [processCommand]
  })

  const result = await testCli.run(['process', '--help', '--format', 'json'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('"type": "help"')
  expect(result.stdout).toContain('"path": [')
})

test('createTestCLI honors explicit --format when global parsing fails', async () => {
  const testCli = await createTestCLI()

  const result = await testCli.run(['--format', 'yaml', '--image-mode', 'invalid'])

  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('kind: validation')
  expect(result.stderr).toContain('name: BunliValidationError')
})

test('createTestCLI strips explicit boolean global values before command resolution', async () => {
  const buildCommand = defineCommand({
    name: 'build',
    description: 'Build the project',
    async handler() {
      console.log('building')
    }
  })

  const testCli = await createTestCLI({
    commands: [buildCommand]
  })

  const result = await testCli.run(['--help', 'false', 'build'])

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('building')
})
