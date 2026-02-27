import { test, expect, describe } from 'bun:test'
import { Result } from 'better-result'
import { Generator } from '../src/generator.js'
import { CommandScanner } from '../src/scanner.js'
import { parseCommand } from '../src/parser.js'
import { buildTypes } from '../src/builder.js'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

describe('Generator', () => {
  const testDir = join(import.meta.dir, 'fixtures')
  const outputFile = join(testDir, 'commands.gen.ts')

  async function writeEntryWithCommands(commandImports: string[]) {
    const importLines = commandImports.map((file, index) => `import command${index} from '${file}'`).join('\n')
    const registerLines = commandImports.map((_, index) => `cli.command(command${index})`).join('\n')
    const content = `
import { createCLI } from '@bunli/core'
${importLines}

const cli = await createCLI({
  name: 'test-cli',
  version: '0.0.0'
})
${registerLines}
`
    await Bun.write(join(testDir, 'cli.ts'), content)
  }

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
    await writeEntryWithCommands(['./test-command.js'])

    const scanner = new CommandScanner()
    const filesResult = await scanner.scanCommands(join(testDir, 'cli.ts'))
    expect(Result.isOk(filesResult)).toBe(true)
    if (Result.isError(filesResult)) {
      throw filesResult.error
    }
    expect(filesResult.value.length).toBeGreaterThan(0)
    expect(filesResult.value.some(f => f.includes('test-command.ts'))).toBe(true)

    // Cleanup
    await rm(testDir, { recursive: true, force: true })
  })

  test('scanner resolves locally aliased command identifiers to imported modules', async () => {
    await mkdir(testDir, { recursive: true })

    await Bun.write(join(testDir, 'alias-command.ts'), `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: 'alias-command',
  description: 'Alias command',
  handler: async () => {}
})
`)

    await Bun.write(join(testDir, 'cli.ts'), `
import { createCLI } from '@bunli/core'
import importedCommand from './alias-command.js'

const aliasedCommand = importedCommand

const cli = await createCLI({
  name: 'alias-cli',
  version: '0.0.0'
})

cli.command(aliasedCommand)
`)

    const scanner = new CommandScanner()
    const filesResult = await scanner.scanCommands(join(testDir, 'cli.ts'))
    expect(Result.isOk(filesResult)).toBe(true)
    if (Result.isError(filesResult)) {
      throw filesResult.error
    }

    expect(filesResult.value.some((file) => file.endsWith('alias-command.ts'))).toBe(true)

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
    const metadataResult = await parseCommand(commandFile, testDir, outputFile)

    expect(Result.isOk(metadataResult)).toBe(true)
    if (Result.isError(metadataResult)) {
      throw metadataResult.error
    }
    expect(metadataResult.value).toBeTruthy()
    expect(metadataResult.value?.name).toBe('test-command')
    expect(metadataResult.value?.description).toBe('A test command')

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
    await writeEntryWithCommands(['./test-command.js'])

    // Create generator and run it
    const generator = new Generator({
      entry: join(testDir, 'cli.ts'),
      outputFile
    })

    const generation = await generator.run()
    expect(Result.isOk(generation)).toBe(true)

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

  test('returns Err when command file cannot be parsed', async () => {
    await mkdir(testDir, { recursive: true })
    const invalidCommandFile = join(testDir, 'invalid.ts')
    await Bun.write(invalidCommandFile, `export default defineCommand({ name: 'broken' `)

    const parsed = await parseCommand(invalidCommandFile, testDir, outputFile)
    expect(Result.isError(parsed)).toBe(true)
    if (Result.isError(parsed)) {
      expect(parsed.error.filePath).toContain('invalid.ts')
    }

    await rm(testDir, { recursive: true, force: true })
  })

  test('returns Err when command module does not default-export', async () => {
    await mkdir(testDir, { recursive: true })
    const namedOnlyFile = join(testDir, 'named-only.ts')
    await Bun.write(
      namedOnlyFile,
      `
import { defineCommand } from '@bunli/core'

export const namedOnly = defineCommand({
  name: 'named-only',
  description: 'Named only command',
  handler: async () => {}
})
`
    )

    const parsed = await parseCommand(namedOnlyFile, testDir, outputFile)
    expect(Result.isError(parsed)).toBe(true)
    if (Result.isError(parsed)) {
      expect(parsed.error.message).toContain('Could not parse command file')
    }

    await rm(testDir, { recursive: true, force: true })
  })

  test('returns Err when output file cannot be written', async () => {
    await mkdir(testDir, { recursive: true })
    await Bun.write(
      join(testDir, 'test-command.ts'),
      `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: 'test-command',
  description: 'A test command',
  handler: async () => {}
})
`
    )
    await writeEntryWithCommands(['./test-command.js'])

    const generator = new Generator({
      entry: join(testDir, 'cli.ts'),
      outputFile: '/dev/null/commands.gen.ts'
    })

    const generation = await generator.run()
    expect(Result.isError(generation)).toBe(true)

    await rm(testDir, { recursive: true, force: true })
  })

  test('treats missing fallback directory as empty command set when no entry registrations are found', async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })
    await Bun.write(join(testDir, 'cli.ts'), `
import { createCLI } from '@bunli/core'
await createCLI({ name: 'empty-cli', version: '0.0.0' })
`)

    const missingCommandsDir = join(testDir, 'missing-commands')
    const outputForMissingDir = join(testDir, 'commands.gen.ts')
    const generator = new Generator({
      entry: join(testDir, 'cli.ts'),
      directory: missingCommandsDir,
      outputFile: outputForMissingDir
    })

    const generation = await generator.run()
    expect(Result.isOk(generation)).toBe(true)

    const output = await Bun.file(outputForMissingDir).text()
    expect(output).toContain('const modules: Record<GeneratedNames, Command<any>> = {')

    await rm(testDir, { recursive: true, force: true })
  })
})
