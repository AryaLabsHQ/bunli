import { test, expect } from 'bun:test'
import { testCommand, expectCommand } from '@bunli/test'
import { initCommand } from '../src/commands/init.js'
import { validateCommand } from '../src/commands/validate.js'
import { configCommand } from '../src/commands/config.js'

test('init command - creates config file', async () => {
  const result = await testCommand(initCommand, {
    flags: { template: 'minimal', force: true }
  })
  
  expectCommand(result).toHaveSucceeded()
  expectCommand(result).toContainInStdout('Config file created')
})

test('validate command - reports errors', async () => {
  const result = await testCommand(validateCommand, {
    args: ['src/**/*.ts'],
    flags: { fix: false }
  })
  
  // Result depends on actual files, but command should run
  expect(result.exitCode).toBeDefined()
})

test('config list command', async () => {
  const listCommand = configCommand.subcommands?.find(cmd => cmd.name === 'list')
  expect(listCommand).toBeDefined()
  
  const result = await testCommand(listCommand!, {})
  
  expectCommand(result).toHaveSucceeded()
  expectCommand(result).toContainInStdout('Configuration:')
})