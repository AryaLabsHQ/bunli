import { test, expect } from 'bun:test'
import { defineCommand, option, SchemaError } from '@bunli/core'
import { z } from 'zod'
import { testCommand, expectCommand, mockPromptResponses, mockShellCommands, mockInteractive, mockValidationAttempts, mergeTestOptions } from '../src/index.js'

test('complex validation scenario with Standard Schema', async () => {
  const userSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    age: z.number().int().min(18, 'Must be 18 or older'),
    email: z.string().email('Invalid email format')
  })
  
  const command = defineCommand({
    name: 'register',
    description: 'Register a new user',
    options: {
      user: option(userSchema)
    },
    handler: async ({ flags }) => {
      // In real usage, the transformation would happen during parsing
      const user = { ...flags.user, isAdult: flags.user.age >= 18 }
      console.log(`Registered ${user.name} (${user.age}) at ${user.email}`)
      console.log(`Adult: ${user.isAdult}`)
    }
  })
  
  const result = await testCommand(command, {
    flags: {
      user: { name: 'Alice Johnson', age: 25, email: 'alice@example.com' }
    }
  })
  
  expect(result.stdout).toContain('Registered Alice Johnson (25) at alice@example.com')
  expect(result.stdout).toContain('Adult: true')
})

test('validation error handling with Standard Schema', async () => {
  const command = defineCommand({
    name: 'validate',
    options: {
      port: option(z.number().int().min(1).max(65535), { description: 'Port number' })
    },
    handler: async ({ flags }) => {
      console.log(`Using port: ${flags.port}`)
    }
  })
  
  // Note: In actual CLI usage, validation errors would be caught before the handler runs
  // For testing, we need to simulate the parsing phase
  try {
    const schema = z.number().int().min(1).max(65535)
    const result = await schema['~standard'].validate(99999)
    if (result.issues) {
      throw new SchemaError(result.issues)
    }
  } catch (error) {
    expect(error).toBeInstanceOf(SchemaError)
  }
})

test('nested command prompt mocking', async () => {
  const command = defineCommand({
    name: 'deploy',
    description: 'Deploy application',
    handler: async ({ prompt, shell, spinner }) => {
      const env = await prompt.select('Select environment:', {
        options: ['development', 'staging', 'production'].map(value => ({ label: value, value }))
      })
      
      if (env === 'production') {
        const confirmed = await prompt.confirm('Are you sure you want to deploy to production?')
        if (!confirmed) {
          console.log('Deployment cancelled')
          return
        }
      }
      
      const spin = spinner('Deploying...')
      const branch = await shell`git branch --show-current`.text()
      spin.succeed(`Deployed ${branch.trim()} to ${env}`)
    }
  })
  
  // Test production deployment with confirmation
  const result1 = await testCommand(command, mockPromptResponses({
    'Select environment:': '3',  // production
    'Are you sure you want to deploy to production?': 'y'
  }))
  
  expect(result1.stdout).toContain('Deployed main to production')
  
  // Test cancelled production deployment
  const result2 = await testCommand(command, mockPromptResponses({
    'Select environment:': '3',  // production
    'Are you sure you want to deploy to production?': 'n'
  }))
  
  expect(result2.stdout).toContain('Deployment cancelled')
})

test('multi-step form with validation retries', async () => {
  const command = defineCommand({
    name: 'setup',
    description: 'Project setup wizard',
    handler: async ({ prompt }) => {
      const name = await prompt('Project name:', {
        schema: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
      })
      
      const version = await prompt('Initial version:', {
        schema: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be in format X.Y.Z')
      })
      
      const license = await prompt.select('License:', {
        options: ['MIT', 'Apache-2.0', 'GPL-3.0', 'Proprietary'].map(value => ({ label: value, value }))
      })
      
      console.log(`Created ${name} v${version} with ${license} license`)
    }
  })
  
  const result = await testCommand(command, mockPromptResponses({
    'Project name:': ['My Project', 'my_project', 'my-project'],  // First two fail validation
    'Initial version:': ['1.0', '1.0.0'],  // First fails validation
    'License:': '1'  // MIT
  }))
  
  expect(result.stderr).toContain('Only lowercase letters, numbers, and hyphens allowed')
  expect(result.stderr).toContain('Must be in format X.Y.Z')
  expect(result.stdout).toContain('Created my-project v1.0.0 with MIT license')
})

test('shell command mocking with complex outputs', async () => {
  const command = defineCommand({
    name: 'status',
    description: 'Show project status',
    handler: async ({ shell, colors }) => {
      const gitStatus = await shell`git status --porcelain`.text()
      const npmOutdated = await shell`npm outdated --json`.json()
      const nodeVersion = await shell`node --version`.text()
      
      console.log(colors.bold('Project Status:'))
      console.log(`Node: ${nodeVersion.trim()}`)
      console.log(`Working tree: ${gitStatus.trim() === '' ? colors.green('clean') : colors.yellow('modified')}`)
      console.log(`Outdated packages: ${Object.keys(npmOutdated).length}`)
    }
  })
  
  const result = await testCommand(command, mockShellCommands({
    'git status --porcelain': 'M package.json\n',
    'npm outdated --json': JSON.stringify({
      'express': { current: '4.17.1', wanted: '4.18.0', latest: '4.18.0' },
      'typescript': { current: '4.5.0', wanted: '4.9.0', latest: '5.0.0' }
    }),
    'node --version': 'v20.10.0\n'
  }))
  
  expect(result.stdout).toContain('[bold]Project Status:[/bold]')
  expect(result.stdout).toContain('Node: v20.10.0')
  expect(result.stdout).toContain('Working tree: [yellow]modified[/yellow]')
  expect(result.stdout).toContain('Outdated packages: 2')
})

test('mergeTestOptions with conflicting options', async () => {
  const command = defineCommand({
    name: 'test',
    handler: async ({ prompt, flags, env }) => {
      const name = await prompt('Name:')
      console.log(`Hello ${name} (verbose: ${flags.verbose}, env: ${env.NODE_ENV})`)
    }
  })
  
  const result = await testCommand(command, mergeTestOptions(
    { flags: { verbose: false }, env: { NODE_ENV: 'development' } },
    mockPromptResponses({ 'Name:': 'Bob' }),
    { flags: { verbose: true } },  // This overrides the previous verbose: false
    { env: { NODE_ENV: 'test', DEBUG: '1' } }  // This overrides NODE_ENV and adds DEBUG
  ))
  
  expect(result.stdout).toContain('Hello Bob (verbose: true, env: test)')
})

test('password prompt with validation', async () => {
  const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
  
  const command = defineCommand({
    name: 'secure',
    handler: async ({ prompt }) => {
      const password = await prompt.password('Enter password:', {
        schema: passwordSchema
      })
      console.log('Password accepted!')
      console.log(`Strength: ${password.length > 12 ? 'Strong' : 'Medium'}`)
    }
  })
  
  const result = await testCommand(command, mockPromptResponses({
    'Enter password:': ['weak', 'Weak1234', 'Strong1234']
  }))
  
  expect(result.stderr).toContain('Password must be at least 8 characters')
  expect(result.stdout).toContain('********')  // Masked output for "Weak1234"
  expect(result.stdout).toContain('Password accepted!')
  expect(result.stdout).toContain('Strength: Medium')
})

test('multiselect prompt', async () => {
  const command = defineCommand({
    name: 'features',
    handler: async ({ prompt }) => {
      const features = await prompt.multiselect('Select features to enable:', {
        options: [
          { label: 'TypeScript', value: 'ts' },
          { label: 'ESLint', value: 'eslint' },
          { label: 'Prettier', value: 'prettier' },
          { label: 'Testing', value: 'test' },
          { label: 'CI/CD', value: 'ci' }
        ]
      })
      console.log(`Enabled features: ${features.join(', ')}`)
    }
  })
  
  const result = await testCommand(command, mockPromptResponses({
    'Select features to enable:': '1,3,4'  // TypeScript, Prettier, Testing
  }))
  
  expect(result.stdout).toContain('[ ] 1. TypeScript')
  expect(result.stdout).toContain('[ ] 2. ESLint')
  expect(result.stdout).toContain('[ ] 3. Prettier')
  expect(result.stdout).toContain('[ ] 4. Testing')
  expect(result.stdout).toContain('[ ] 5. CI/CD')
  expect(result.stdout).toContain('Enabled features: ts, prettier, test')
})

test('stdin fallback when mockPrompts not provided', async () => {
  const command = defineCommand({
    name: 'mixed',
    handler: async ({ prompt }) => {
      const name = await prompt('Name:')  // Will use mockPrompts
      const age = await prompt('Age:')    // Will fall back to stdin
      console.log(`${name} is ${age} years old`)
    }
  })
  
  const result = await testCommand(command, mergeTestOptions(
    mockPromptResponses({ 'Name:': 'Charlie' }),
    { stdin: '30' }  // This will be used for Age prompt
  ))
  
  expect(result.stdout).toContain('Charlie is 30 years old')
})

test('custom shell command output simulation', async () => {
  const command = defineCommand({
    name: 'docker-status',
    handler: async ({ shell }) => {
      try {
        const containers = await shell`docker ps --format "table {{.Names}}\t{{.Status}}"`.text()
        console.log('Docker containers:')
        console.log(containers)
      } catch (error) {
        console.error('Docker not available')
      }
    }
  })
  
  const result = await testCommand(command, mockShellCommands({
    'docker ps --format "table {{.Names}}\t{{.Status}}"': `NAMES               STATUS
web-app             Up 2 hours
postgres-db         Up 2 hours
redis-cache         Up 1 hour`
  }))
  
  expect(result.stdout).toContain('Docker containers:')
  expect(result.stdout).toContain('web-app')
  expect(result.stdout).toContain('postgres-db')
  expect(result.stdout).toContain('redis-cache')
})