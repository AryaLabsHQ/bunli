import { test, expect } from 'bun:test'
import { testCommand, expectCommand } from '@bunli/test'
import { helloCommand } from '../src/commands/hello.js'

test('hello command - default name', async () => {
  const result = await testCommand(helloCommand)
  
  expectCommand(result).toHaveSucceeded()
  expectCommand(result).toContainInStdout('Hello, World.')
})

test('hello command - custom name', async () => {
  const result = await testCommand(helloCommand, {
    flags: { name: 'Alice' }
  })
  
  expectCommand(result).toContainInStdout('Hello, Alice.')
})

test('hello command - excited flag', async () => {
  const result = await testCommand(helloCommand, {
    flags: { name: 'Bob', excited: true }
  })
  
  expectCommand(result).toContainInStdout('Hello, Bob!')
})