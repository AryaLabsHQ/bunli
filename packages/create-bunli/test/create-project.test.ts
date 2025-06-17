import { test, expect, mock } from 'bun:test'
import { createProject } from '../src/create-project'
import type { BunliUtils } from '@bunli/utils'

// Mock shell that tracks commands
const mockShell = (commands: string[] = []) => {
  const fn = (strings: TemplateStringsArray, ...values: any[]) => {
    const command = strings.reduce((acc, str, i) => {
      return acc + str + (values[i] || '')
    }, '')
    commands.push(command)
    
    return {
      quiet: () => Promise.resolve(),
      text: () => Promise.resolve(command)
    }
  }
  fn.commands = commands
  return fn as any
}

// Mock utilities
const mockUtils = (overrides = {}) => ({
  prompt: Object.assign(mock(() => Promise.resolve('test')), {
    confirm: mock(() => Promise.resolve(true))
  }),
  spinner: mock((text: string) => ({
    start: mock(),
    succeed: mock(),
    fail: mock(),
    update: mock()
  })),
  colors: {
    red: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
  },
  ...overrides
})

test('createProject - creates basic template', async () => {
  const commands: string[] = []
  const shell = mockShell(commands)
  const utils = mockUtils()
  
  // Mock Bun.write
  const writes: Record<string, string> = {}
  const originalWrite = Bun.write
  Bun.write = mock((path: string, content: string) => {
    writes[path] = content
    return Promise.resolve(content.length)
  })
  
  await createProject({
    name: 'test-app',
    dir: '/tmp/test-app',
    template: 'basic',
    git: false,
    install: false,
    packageManager: 'bun',
    shell,
    ...utils
  })
  
  // Restore
  Bun.write = originalWrite
  
  // Check directory creation
  expect(commands).toContain('mkdir -p /tmp/test-app')
  
  // Check files were created
  expect(writes).toHaveProperty('/tmp/test-app/package.json')
  expect(writes['/tmp/test-app/package.json']).toContain('"name": "test-app"')
  expect(writes['/tmp/test-app/package.json']).toContain('"@bunli/core": "^0.1.0"')
  
  expect(writes).toHaveProperty('/tmp/test-app/tsconfig.json')
  expect(writes).toHaveProperty('/tmp/test-app/README.md')
  expect(writes).toHaveProperty('/tmp/test-app/.gitignore')
  expect(writes).toHaveProperty('/tmp/test-app/src/cli.ts')
  expect(writes).toHaveProperty('/tmp/test-app/src/commands/hello.ts')
})

test('createProject - handles existing directory', async () => {
  const commands: string[] = []
  const shell = mockShell(commands)
  
  // Mock directory exists
  shell.quiet = () => Promise.reject(new Error('Directory exists'))
  
  const utils = mockUtils({
    prompt: Object.assign(mock(), {
      confirm: mock(() => Promise.resolve(false)) // User says no to overwrite
    })
  })
  
  let exitCode: number | undefined
  const originalExit = process.exit
  process.exit = mock((code?: number) => {
    exitCode = code
    throw new Error('Process exit')
  }) as any
  
  try {
    await createProject({
      name: 'test-app',
      dir: '/tmp/test-app',
      template: 'basic',
      git: false,
      install: false,
      packageManager: 'bun',
      shell,
      ...utils
    })
  } catch (e: any) {
    expect(e.message).toBe('Process exit')
  }
  
  // Restore
  process.exit = originalExit
  
  expect(exitCode).toBe(1)
  expect(utils.prompt.confirm).toHaveBeenCalledWith(
    'Directory /tmp/test-app already exists. Overwrite?',
    { default: false }
  )
})

test('createProject - initializes git when requested', async () => {
  const commands: string[] = []
  const shell = mockShell(commands)
  const utils = mockUtils()
  
  // Mock Bun.write
  const originalWrite = Bun.write
  Bun.write = mock(() => Promise.resolve(0))
  
  await createProject({
    name: 'test-app',
    dir: '/tmp/test-app',
    template: 'basic',
    git: true,
    install: false,
    packageManager: 'bun',
    shell,
    ...utils
  })
  
  // Restore
  Bun.write = originalWrite
  
  // Check git commands
  expect(commands).toContain('cd /tmp/test-app && git init')
  expect(commands).toContain('cd /tmp/test-app && git add .')
  expect(commands).toContain('cd /tmp/test-app && git commit -m "Initial commit"')
})

test('createProject - installs dependencies with correct package manager', async () => {
  const testCases = [
    { pm: 'bun', cmd: 'bun install' },
    { pm: 'pnpm', cmd: 'pnpm install' },
    { pm: 'yarn', cmd: 'yarn install' },
    { pm: 'npm', cmd: 'npm install' }
  ]
  
  for (const { pm, cmd } of testCases) {
    const commands: string[] = []
    const shell = mockShell(commands)
    const utils = mockUtils()
    
    // Mock Bun.write
    const originalWrite = Bun.write
    Bun.write = mock(() => Promise.resolve(0))
    
    await createProject({
      name: 'test-app',
      dir: '/tmp/test-app',
      template: 'basic',
      git: false,
      install: true,
      packageManager: pm as any,
      shell,
      ...utils
    })
    
    // Restore
    Bun.write = originalWrite
    
    // Check install command
    expect(commands).toContain(`cd /tmp/test-app && ${cmd}`)
  }
})