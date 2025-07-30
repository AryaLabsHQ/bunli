import { test, expect } from 'bun:test'
import { createCLI } from '../cli.js'
import { defineCommand, option } from '../types.js'
import { z } from 'zod'

test('global flags are available to all commands', async () => {
  const cli = await createCLI({
    name: 'test-cli',
    version: '1.0.0'
  })
  
  let capturedFlags: any = {}
  
  cli.command(defineCommand({
    name: 'test',
    description: 'Test command',
    options: {
      custom: option(z.string().optional(), { description: 'Custom flag' })
    },
    handler: async ({ flags }) => {
      capturedFlags = flags
    }
  }))
  
  await cli.run(['test', '--interactive', '--custom', 'value'])
  
  expect(capturedFlags.interactive).toBe(true)
  expect(capturedFlags.custom).toBe('value')
  expect(capturedFlags.tui).toBe(false)
})

test('terminal info is provided to handlers', async () => {
  const cli = await createCLI({
    name: 'test-cli',
    version: '1.0.0'
  })
  
  let capturedTerminal: any = null
  
  cli.command(defineCommand({
    name: 'test',
    description: 'Test command',
    handler: async ({ terminal }) => {
      capturedTerminal = terminal
    }
  }))
  
  await cli.run(['test'])
  
  expect(capturedTerminal).toBeDefined()
  expect(capturedTerminal.width).toBeGreaterThan(0)
  expect(capturedTerminal.height).toBeGreaterThan(0)
  expect(typeof capturedTerminal.isInteractive).toBe('boolean')
  expect(typeof capturedTerminal.isCI).toBe('boolean')
  expect(typeof capturedTerminal.supportsColor).toBe('boolean')
  expect(typeof capturedTerminal.supportsMouse).toBe('boolean')
})

test('runtime info is provided to handlers', async () => {
  const cli = await createCLI({
    name: 'test-cli',
    version: '1.0.0'
  })
  
  let capturedRuntime: any = null
  
  cli.command(defineCommand({
    name: 'test',
    description: 'Test command',
    handler: async ({ runtime }) => {
      capturedRuntime = runtime
    }
  }))
  
  await cli.run(['test', 'arg1', 'arg2'])
  
  expect(capturedRuntime).toBeDefined()
  expect(capturedRuntime.command).toBe('test')
  expect(capturedRuntime.args).toEqual(['arg1', 'arg2'])
  expect(capturedRuntime.startTime).toBeGreaterThan(0)
})

test('version flag shows version', async () => {
  const originalLog = console.log
  let loggedMessage = ''
  console.log = (msg: string) => { loggedMessage = msg }
  
  const cli = await createCLI({
    name: 'test-cli',
    version: '1.2.3'
  })
  
  await cli.run(['--version'])
  
  expect(loggedMessage).toBe('test-cli v1.2.3')
  
  console.log = originalLog
})