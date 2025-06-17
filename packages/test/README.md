# @bunli/test

Testing utilities for Bunli CLI applications.

## Installation

```bash
bun add -d @bunli/test
```

## Features

- 🧪 Test individual commands or entire CLIs
- 🎭 Mock user prompts and shell commands
- ✅ Built-in test matchers for CLI output
- 🔄 Support for validation and retry scenarios
- 📝 TypeScript support with full type inference

## Usage

### Basic Command Testing

```typescript
import { test, expect } from 'bun:test'
import { defineCommand } from '@bunli/core'
import { testCommand, expectCommand } from '@bunli/test'

const greetCommand = defineCommand({
  name: 'greet',
  description: 'Greet someone',
  handler: async ({ colors }) => {
    console.log(colors.green('Hello, world!'))
  }
})

test('greet command', async () => {
  const result = await testCommand(greetCommand)
  
  expectCommand(result).toHaveSucceeded()
  expectCommand(result).toContainInStdout('[green]Hello, world![/green]')
})
```

### Testing with Flags

```typescript
const deployCommand = defineCommand({
  name: 'deploy',
  options: {
    env: option(z.enum(['dev', 'prod'])),
    force: option(z.boolean().default(false))
  },
  handler: async ({ flags }) => {
    console.log(`Deploying to ${flags.env}${flags.force ? ' (forced)' : ''}`)
  }
})

test('deploy with flags', async () => {
  const result = await testCommand(deployCommand, {
    flags: { env: 'prod', force: true }
  })
  
  expect(result.stdout).toContain('Deploying to prod (forced)')
})
```

### Mocking User Prompts

```typescript
import { mockPromptResponses } from '@bunli/test'

const setupCommand = defineCommand({
  name: 'setup',
  handler: async ({ prompt }) => {
    const name = await prompt('Project name:')
    const useTs = await prompt.confirm('Use TypeScript?')
    console.log(`Creating ${name} with${useTs ? '' : 'out'} TypeScript`)
  }
})

test('interactive setup', async () => {
  const result = await testCommand(setupCommand, mockPromptResponses({
    'Project name:': 'my-app',
    'Use TypeScript?': 'y'
  }))
  
  expect(result.stdout).toContain('Creating my-app with TypeScript')
})
```

### Mocking Shell Commands

```typescript
import { mockShellCommands } from '@bunli/test'

const statusCommand = defineCommand({
  name: 'status',
  handler: async ({ shell }) => {
    const branch = await shell`git branch --show-current`.text()
    const status = await shell`git status --porcelain`.text()
    console.log(`On branch: ${branch.trim()}`)
    console.log(`Clean: ${status.trim() === ''}`)
  }
})

test('git status', async () => {
  const result = await testCommand(statusCommand, mockShellCommands({
    'git branch --show-current': 'feature/awesome\n',
    'git status --porcelain': ''
  }))
  
  expect(result.stdout).toContain('On branch: feature/awesome')
  expect(result.stdout).toContain('Clean: true')
})
```

### Testing Validation with Retries

```typescript
const emailCommand = defineCommand({
  name: 'register',
  handler: async ({ prompt }) => {
    const email = await prompt('Enter email:', {
      schema: z.string().email()
    })
    console.log(`Registered: ${email}`)
  }
})

test('email validation', async () => {
  const result = await testCommand(emailCommand, mockPromptResponses({
    'Enter email:': ['invalid', 'still-bad', 'valid@email.com']
  }))
  
  // First two attempts fail validation
  expect(result.stderr).toContain('Invalid email')
  // Third attempt succeeds
  expect(result.stdout).toContain('Registered: valid@email.com')
})
```

### Testing Complete CLIs

```typescript
import { createCLI } from '@bunli/core'
import { testCLI } from '@bunli/test'

test('CLI help', async () => {
  const result = await testCLI(
    (cli) => {
      cli.command('hello', {
        description: 'Say hello',
        handler: async () => console.log('Hello!')
      })
    },
    ['--help']
  )
  
  expectCommand(result).toContainInStdout('Say hello')
})
```

### Using Helper Functions

```typescript
import { mockInteractive, mergeTestOptions } from '@bunli/test'

test('complex interaction', async () => {
  const result = await testCommand(myCommand, mockInteractive(
    {
      'Name:': 'Alice',
      'Continue?': 'y'
    },
    {
      'npm --version': '10.0.0\n'
    }
  ))
  
  // Or merge multiple option sets
  const result2 = await testCommand(myCommand, mergeTestOptions(
    { flags: { verbose: true } },
    mockPromptResponses({ 'Name:': 'Bob' }),
    { env: { NODE_ENV: 'test' } }
  ))
})
```

## Test Matchers

The `expectCommand` function provides CLI-specific test matchers:

```typescript
// Exit code assertions
expectCommand(result).toHaveExitCode(0)
expectCommand(result).toHaveSucceeded()    // exit code 0
expectCommand(result).toHaveFailed()       // exit code !== 0

// Output assertions
expectCommand(result).toContainInStdout('success')
expectCommand(result).toContainInStderr('error')
expectCommand(result).toMatchStdout(/pattern/)
expectCommand(result).toMatchStderr(/error.*occurred/)
```

## API Reference

### `testCommand(command, options?)`

Test a single command.

**Parameters:**
- `command`: Command to test
- `options`: Test options
  - `flags`: Command flags
  - `args`: Positional arguments
  - `env`: Environment variables
  - `cwd`: Working directory
  - `stdin`: Input lines (string or array)
  - `mockPrompts`: Map of prompt messages to responses
  - `mockShellCommands`: Map of shell commands to outputs
  - `exitCode`: Expected exit code

**Returns:** `TestResult` with stdout, stderr, exitCode, duration, and error

### `testCLI(setupFn, argv, options?)`

Test a complete CLI with multiple commands.

**Parameters:**
- `setupFn`: Function to configure the CLI
- `argv`: Command line arguments
- `options`: Test options (same as testCommand)

### Helper Functions

- `mockPromptResponses(responses)`: Create options with mock prompt responses
- `mockShellCommands(commands)`: Create options with mock shell outputs
- `mockInteractive(prompts, commands?)`: Combine prompt and shell mocks
- `mockValidationAttempts(attempts)`: Create stdin for validation testing
- `mergeTestOptions(...options)`: Merge multiple test option objects

## Tips

1. **Colors in Output**: The test utilities preserve color codes as tags (e.g., `[green]text[/green]`) for easier assertion

2. **Multiple Attempts**: For validation scenarios, provide arrays of responses:
   ```typescript
   mockPromptResponses({
     'Enter age:': ['abc', '-5', '25']  // Tries each until valid
   })
   ```

3. **Default Mocks**: Common commands have default mock responses:
   - `git branch --show-current`: Returns `main\n`
   - `git status`: Returns `nothing to commit, working tree clean\n`

4. **Schema Validation**: The mock prompt automatically handles Standard Schema validation and retry logic

## License

MIT