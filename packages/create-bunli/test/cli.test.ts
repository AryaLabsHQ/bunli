import { test, expect } from 'bun:test'
import { testCommand, expectCommand } from '@bunli/test'
import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { create } from '../src/create'

// Create test command
const createTestCommand = () => {
  return defineCommand({
    name: 'create',
    description: 'Create a new Bunli CLI project',
    options: {
      name: option(z.string().optional(), { description: 'Project name' }),
      template: option(
        z.enum(['basic', 'advanced', 'monorepo']).default('basic'),
        { short: 't', description: 'Project template' }
      ),
      dir: option(
        z.string().optional(),
        { short: 'd', description: 'Directory to create project in' }
      ),
      git: option(
        z.boolean().default(true),
        { short: 'g', description: 'Initialize git repository' }
      ),
      install: option(
        z.boolean().default(true),
        { short: 'i', description: 'Install dependencies' }
      ),
      'package-manager': option(
        z.enum(['bun', 'pnpm', 'yarn', 'npm']).default('bun'),
        { short: 'p', description: 'Package manager to use' }
      )
    },
    handler: create
  })
}

test('create command - prompts for project name', async () => {
  const command = createTestCommand()
  const result = await testCommand(command, {
    flags: { git: false, install: false },
    stdin: ['my-test-app', 'y']
  })
  
  expectCommand(result).toHaveExitCode(1) // Would exit 1 because shell commands aren't mocked
  expectCommand(result).toContainInStdout('Creating Bunli project:')
  expectCommand(result).toContainInStdout('my-test-app')
})

test('create command - validates project name', async () => {
  const command = createTestCommand()
  const result = await testCommand(command, {
    args: ['MyInvalidName'],
    flags: { git: false, install: false }
  })
  
  expectCommand(result).toHaveExitCode(1)
  expectCommand(result).toContainInStderr('Project name must only contain lowercase letters')
})

test('create command - uses positional argument', async () => {
  const command = createTestCommand()
  const result = await testCommand(command, {
    args: ['my-app'],
    flags: { git: false, install: false },
    stdin: ['n'] // Cancel to avoid shell commands
  })
  
  expectCommand(result).toHaveExitCode(1)
  expectCommand(result).toContainInStdout('Creating Bunli project:')
  expectCommand(result).toContainInStdout('my-app')
  expectCommand(result).toContainInStdout('Cancelled')
})

test('create command - different templates', async () => {
  const templates = ['basic', 'advanced', 'monorepo']
  
  for (const template of templates) {
    const command = createTestCommand()
    const result = await testCommand(command, {
      args: ['test-app'],
      flags: { 
        template,
        git: false,
        install: false
      },
      stdin: ['n']
    })
    
    expectCommand(result).toContainInStdout(`Template: ${template}`)
  }
})

test('create command - package manager options', async () => {
  const packageManagers = ['bun', 'pnpm', 'yarn', 'npm']
  
  for (const pm of packageManagers) {
    const command = createTestCommand()
    const result = await testCommand(command, {
      args: ['test-app'],
      flags: { 
        'package-manager': pm,
        git: false,
        install: false
      },
      stdin: ['n']
    })
    
    expectCommand(result).toContainInStdout(`Package:  ${pm}`)
  }
})