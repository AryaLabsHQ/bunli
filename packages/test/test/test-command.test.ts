import { test, expect } from 'bun:test'
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { testCommand, expectCommand } from '../src/index.js'
import { mockPromptResponses, mockShellCommands, mockInteractive } from '../src/helpers.js'

test('testCommand - basic command execution', async () => {
  const command = defineCommand({
    name: 'hello',
    description: 'Say hello',
    handler: async ({ flags, colors }) => {
      console.log(colors.green('Hello, world!'))
    }
  })
  
  const result = await testCommand(command)
  
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('[green]Hello, world![/green]')
  expect(result.stderr).toBe('')
})

test('testCommand - with flags', async () => {
  const command = defineCommand({
    name: 'greet',
    description: 'Greet someone',
    options: {
      name: option(z.string().default('World')),
      loud: option(z.boolean().default(false), { short: 'l' })
    },
    handler: async ({ flags }) => {
      const message = `Hello, ${flags.name}!`
      console.log(flags.loud ? message.toUpperCase() : message)
    }
  })
  
  const result = await testCommand(command, {
    flags: { name: 'Alice', loud: true }
  })
  
  expect(result.stdout).toBe('HELLO, ALICE!')
  expectCommand(result).toHaveSucceeded()
})

test('testCommand - with prompts', async () => {
  const command = defineCommand({
    name: 'setup',
    description: 'Setup wizard',
    handler: async ({ prompt, colors }) => {
      const name = await prompt('What is your name?')
      const confirmed = await prompt.confirm('Continue?', { default: true })
      
      if (confirmed) {
        console.log(colors.green(`Welcome, ${name}!`))
      }
    }
  })
  
  const result = await testCommand(command, {
    stdin: ['Alice', 'y']
  })
  
  expect(result.stdout).toContain('What is your name?')
  expect(result.stdout).toContain('Alice')
  expect(result.stdout).toContain('Continue?')
  expect(result.stdout).toContain('[green]Welcome, Alice![/green]')
})

test('testCommand - select prompt', async () => {
  const command = defineCommand({
    name: 'choose',
    description: 'Choose an option',
    handler: async ({ prompt }) => {
      const choice = await prompt.select('Pick a color:', {
        options: [
          { label: 'red', value: 'red' },
          { label: 'green', value: 'green' },
          { label: 'blue', value: 'blue' }
        ]
      })
      console.log(`You chose: ${choice}`)
    }
  })
  
  const result = await testCommand(command, {
    stdin: ['2'] // Select second option (green)
  })
  
  expect(result.stdout).toContain('Pick a color:')
  expect(result.stdout).toContain('1. red')
  expect(result.stdout).toContain('2. green')
  expect(result.stdout).toContain('3. blue')
  expect(result.stdout).toContain('You chose: green')
})

test('testCommand - spinner', async () => {
  const command = defineCommand({
    name: 'process',
    description: 'Process something',
    handler: async ({ spinner }) => {
      const spin = spinner('Processing...')
      spin.update('Still processing...')
      spin.succeed('Done!')
    }
  })
  
  const result = await testCommand(command)
  
  expect(result.stdout).toContain('⠋ Processing...')
  expect(result.stdout).toContain('⠋ Still processing...')
  expect(result.stdout).toContain('✅ Done!')
})

test('testCommand - shell mock', async () => {
  const command = defineCommand({
    name: 'git-info',
    description: 'Show git info',
    handler: async ({ shell }) => {
      const branch = await shell`git branch --show-current`.text()
      console.log(`Current branch: ${branch.trim()}`)
    }
  })
  
  const result = await testCommand(command)
  
  expect(result.stdout).toContain('$ git branch --show-current')
  expect(result.stdout).toContain('Current branch: main')
})

test('testCommand - error handling', async () => {
  const command = defineCommand({
    name: 'fail',
    description: 'Command that fails',
    handler: async () => {
      throw new Error('Something went wrong!')
    }
  })
  
  const result = await testCommand(command)
  
  expectCommand(result).toHaveFailed()
  expectCommand(result).toContainInStderr('Something went wrong!')
  expect(result.error).toBeDefined()
  expect(result.error?.message).toBe('Something went wrong!')
})

test('expectCommand matchers', async () => {
  const command = defineCommand({
    name: 'test',
    description: 'Test matchers',
    handler: async () => {
      console.log('Success message')
      console.error('Error message')
    }
  })
  
  const result = await testCommand(command)
  
  // Test all matchers
  expectCommand(result).toHaveSucceeded()
  expectCommand(result).toHaveExitCode(0)
  expectCommand(result).toContainInStdout('Success message')
  expectCommand(result).toContainInStderr('Error message')
  expectCommand(result).toMatchStdout(/Success/)
  expectCommand(result).toMatchStderr(/Error/)
})

test('testCommand - with mockPrompts', async () => {
  const command = defineCommand({
    name: 'survey',
    description: 'User survey',
    handler: async ({ prompt }) => {
      const name = await prompt('What is your name?')
      const age = await prompt('What is your age?')
      const happy = await prompt.confirm('Are you happy?')
      console.log(`${name} (${age}) is ${happy ? 'happy' : 'not happy'}`)
    }
  })
  
  const result = await testCommand(command, mockPromptResponses({
    'What is your name?': 'Bob',
    'What is your age?': '25',
    'Are you happy?': 'yes'
  }))
  
  expect(result.stdout).toContain('Bob (25) is happy')
})

test('testCommand - with mockShellCommands', async () => {
  const command = defineCommand({
    name: 'deploy',
    description: 'Deploy app',
    handler: async ({ shell }) => {
      const version = await shell`npm --version`.text()
      const branch = await shell`git branch --show-current`.text()
      console.log(`Deploying from ${branch.trim()} with npm ${version.trim()}`)
    }
  })
  
  const result = await testCommand(command, mockShellCommands({
    'npm --version': '10.2.0\n',
    'git branch --show-current': 'feature/awesome\n'
  }))
  
  expect(result.stdout).toContain('Deploying from feature/awesome with npm 10.2.0')
})

test('testCommand - mockInteractive helper', async () => {
  const command = defineCommand({
    name: 'setup',
    description: 'Interactive setup',
    handler: async ({ prompt, shell }) => {
      const name = await prompt('Project name:')
      const useTs = await prompt.confirm('Use TypeScript?')
      const gitUser = await shell`git config user.name`.text()
      console.log(`Setting up ${name} (TS: ${useTs}) for ${gitUser.trim()}`)
    }
  })
  
  const result = await testCommand(command, mockInteractive(
    {
      'Project name:': 'my-app',
      'Use TypeScript?': 'y'
    },
    {
      'git config user.name': 'Alice Developer\n'
    }
  ))
  
  expect(result.stdout).toContain('Setting up my-app (TS: true) for Alice Developer')
})

test('testCommand - validation with retry using mockPrompts', async () => {
  const emailSchema = z.string().email('Invalid email format')
  
  const command = defineCommand({
    name: 'register',
    description: 'Register user',
    handler: async ({ prompt }) => {
      const email = await prompt('Enter email:', { schema: emailSchema })
      console.log(`Registered: ${email}`)
    }
  })
  
  const result = await testCommand(command, mockPromptResponses({
    'Enter email:': ['not-an-email', 'still-bad', 'valid@email.com']
  }))
  
  expect(result.stderr).toContain('Invalid email format')
  expect(result.stdout).toContain('Registered: valid@email.com')
})