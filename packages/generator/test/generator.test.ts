import { test, expect, describe } from 'bun:test'
import { Generator } from '../src/generator.js'
import { CommandScanner } from '../src/scanner.js'
import { parseCommand } from '../src/parser.js'
import { buildTypes } from '../src/builder.js'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

describe('Generator', () => {
  const testDir = join(import.meta.dir, 'fixtures')
  const outputFile = join(testDir, 'commands.gen.ts')

  test('should scan command files', async () => {
    // Ensure test directory exists
    await mkdir(testDir, { recursive: true })

    // Create a test command file
    const testCommandContent = `
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'test-command',
  description: 'A test command',
  options: {
    name: option(z.string(), { description: 'Name option' }),
    count: option(z.number().default(1), { description: 'Count option' })
  },
  handler: async ({ flags }) => {
    console.log('Test command executed')
  }
})
`
    await Bun.write(join(testDir, 'test-command.ts'), testCommandContent)

    const scanner = new CommandScanner()
    const files = await scanner.scanCommands(testDir)
    expect(files.length).toBeGreaterThan(0)
    expect(files.some(f => f.includes('test-command.ts'))).toBe(true)

    // Cleanup
    await rm(testDir, { recursive: true, force: true })
  })

  test('should parse command metadata', async () => {
    // Ensure test directory exists
    await mkdir(testDir, { recursive: true })

    // Create a test command file
    const testCommandContent = `
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'test-command',
  description: 'A test command',
  options: {
    name: option(z.string(), { description: 'Name option' }),
    count: option(z.number().default(1), { description: 'Count option' })
  },
  handler: async ({ flags }) => {
    console.log('Test command executed')
  }
})
`
    await Bun.write(join(testDir, 'test-command.ts'), testCommandContent)

    const commandFile = join(testDir, 'test-command.ts')
    const outputFile = join(testDir, 'commands.gen.ts')
    const metadata = await parseCommand(commandFile, testDir, outputFile)
    
    expect(metadata).toBeTruthy()
    expect(metadata?.name).toBe('test-command')
    expect(metadata?.description).toBe('A test command')

    // Cleanup
    await rm(testDir, { recursive: true, force: true })
  })

  test('should build types', () => {
    const mockCommands = [
      {
        name: 'test-command',
        description: 'A test command',
        filePath: join(testDir, 'test-command.ts'),
        exportPath: './commands/test-command'
      }
    ]

    const types = buildTypes(mockCommands as any)
    expect(types).toContain('const modules: Record<GeneratedNames, Command<any>> = {')
    expect(types).toContain("'test-command'")
    expect(types).toContain('declare module \'@bunli/core\'')
  })

  test('should generate complete types file', async () => {
    // Ensure test directory exists
    await mkdir(testDir, { recursive: true })

    // Create a test command file
    const testCommandContent = `
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'test-command',
  description: 'A test command',
  options: {
    name: option(z.string(), { description: 'Name option' }),
    count: option(z.number().default(1), { description: 'Count option' })
  },
  handler: async ({ flags }) => {
    console.log('Test command executed')
  }
})
`

    await Bun.write(join(testDir, 'test-command.ts'), testCommandContent)

    // Create generator and run it
    const generator = new Generator({
      commandsDir: testDir,
      outputFile
    })

    await generator.run()

    // Check that output file was created
    const output = await Bun.file(outputFile).text()
    expect(output).toContain('const modules: Record<GeneratedNames, Command<any>> = {')
    expect(output).toContain("'test-command'")
    expect(output).toContain('name: \'test-command\'')
    expect(output).toContain('description: \'A test command\'')
    expect(output).toContain('export const generated =')

    // Cleanup
    await rm(testDir, { recursive: true, force: true })
  })
})
