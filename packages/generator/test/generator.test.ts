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

  test('scanner ignores non-code relative imports while traversing entry graph', async () => {
    await mkdir(testDir, { recursive: true })

    await Bun.write(join(testDir, 'data.json'), '{"ok":true}')
    await Bun.write(join(testDir, 'json-import-command.ts'), `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: 'json-import-command',
  description: 'Command with sibling json import in entry',
  handler: async () => {}
})
`)

    await Bun.write(join(testDir, 'cli.ts'), `
import { createCLI } from '@bunli/core'
import './data.json'
import jsonImportCommand from './json-import-command.js'

const cli = await createCLI({
  name: 'json-import-cli',
  version: '0.0.0'
})

cli.command(jsonImportCommand)
`)

    const scanner = new CommandScanner()
    const filesResult = await scanner.scanCommands(join(testDir, 'cli.ts'))
    expect(Result.isOk(filesResult)).toBe(true)
    if (Result.isError(filesResult)) {
      throw filesResult.error
    }

    expect(filesResult.value.some((file) => file.endsWith('json-import-command.ts'))).toBe(true)

    await rm(testDir, { recursive: true, force: true })
  })

  test('scanner ignores inline entry registrations as parse targets', async () => {
    await mkdir(testDir, { recursive: true })

    await Bun.write(join(testDir, 'imported-command.ts'), `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: 'imported-command',
  description: 'Imported command',
  handler: async () => {}
})
`)

    const entryFile = join(testDir, 'cli.ts')
    await Bun.write(entryFile, `
import { createCLI, defineCommand } from '@bunli/core'
import importedCommand from './imported-command.js'

const cli = await createCLI({
  name: 'inline-entry-cli',
  version: '0.0.0'
})

cli.command(importedCommand)
cli.command(defineCommand({
  name: 'inline-command',
  description: 'Inline command',
  handler: async () => {}
}))
`)

    const scanner = new CommandScanner()
    const filesResult = await scanner.scanCommands(entryFile, join(testDir, 'missing-commands'))
    expect(Result.isOk(filesResult)).toBe(true)
    if (Result.isError(filesResult)) {
      throw filesResult.error
    }

    expect(filesResult.value.some((file) => file.endsWith('imported-command.ts'))).toBe(true)
    expect(filesResult.value.some((file) => file.endsWith('/cli.ts'))).toBe(false)

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

  test('parser ignores non-code imports when resolving nested command identifiers', async () => {
    await mkdir(testDir, { recursive: true })

    await Bun.write(join(testDir, 'data.json'), '{"nested":true}')
    const parentCommandFile = join(testDir, 'parent-command.ts')
    await Bun.write(
      parentCommandFile,
      `
import { defineGroup } from '@bunli/core'
import jsonData from './data.json'

export default defineGroup({
  name: 'parent-command',
  description: 'Parent command',
  commands: [jsonData]
})
`
    )

    const parsed = await parseCommand(parentCommandFile, testDir, outputFile)
    expect(Result.isOk(parsed)).toBe(true)
    if (Result.isError(parsed)) {
      throw parsed.error
    }

    expect(parsed.value?.name).toBe('parent-command')
    expect(parsed.value?.commands).toBeUndefined()

    await rm(testDir, { recursive: true, force: true })
  })

  test('parser extracts shared option metadata from imported identifiers and spreads in nested commands', async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(join(testDir, 'config'), { recursive: true })

    await Bun.write(join(testDir, 'config/options.ts'), `
import { option } from '@bunli/core'
import { z } from 'zod'

export const keyOption = option(z.enum(['model', 'size']), {
  description: 'Config key',
  short: 'k'
})

export const valueOption = option(z.string(), {
  description: 'Config value'
})

export const unsetOptions = {
  key: keyOption
}

const sharedOptions = {
  key: keyOption,
  value: valueOption
}

export default sharedOptions
`)

    await Bun.write(join(testDir, 'config/init.ts'), `
import { defineCommand } from '@bunli/core'
import sharedOptions from './options.js'

export default defineCommand({
  name: 'init',
  description: 'Init config',
  options: sharedOptions,
  handler: async () => {}
})
`)

    await Bun.write(join(testDir, 'config/set.ts'), `
import { defineCommand } from '@bunli/core'
import sharedOptions from './options.js'

export default defineCommand({
  name: 'set',
  description: 'Set config',
  options: { ...sharedOptions },
  handler: async () => {}
})
`)

    await Bun.write(join(testDir, 'config/unset.ts'), `
import { defineCommand } from '@bunli/core'
import { unsetOptions } from './options.js'

export default defineCommand({
  name: 'unset',
  description: 'Unset config',
  options: unsetOptions,
  handler: async () => {}
})
`)

    await Bun.write(join(testDir, 'config.ts'), `
import { defineGroup } from '@bunli/core'
import init from './config/init.js'
import set from './config/set.js'
import unset from './config/unset.js'

export default defineGroup({
  name: 'config',
  description: 'Config group',
  commands: [init, set, unset]
})
`)

    const parsed = await parseCommand(join(testDir, 'config.ts'), testDir, outputFile)
    expect(Result.isOk(parsed)).toBe(true)
    if (Result.isError(parsed)) {
      throw parsed.error
    }

    const nested = parsed.value?.commands ?? []
    const init = nested.find((command) => command.name === 'init')
    const set = nested.find((command) => command.name === 'set')
    const unset = nested.find((command) => command.name === 'unset')

    expect(init?.options?.key?.description).toBe('Config key')
    expect(init?.options?.key?.short).toBe('k')
    expect(init?.options?.key?.enumValues).toEqual(['model', 'size'])
    expect(set?.options?.value?.description).toBe('Config value')
    expect(unset?.options?.key?.description).toBe('Config key')

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

  test('generator does not fail on inline-only entry registrations', async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })

    await Bun.write(join(testDir, 'cli.ts'), `
import { createCLI, defineCommand } from '@bunli/core'

const cli = await createCLI({ name: 'inline-only-cli', version: '0.0.0' })
cli.command(defineCommand({
  name: 'inline-only',
  description: 'Inline-only command',
  handler: async () => {}
}))
`)

    const output = join(testDir, 'commands.gen.ts')
    const generator = new Generator({
      entry: join(testDir, 'cli.ts'),
      directory: join(testDir, 'missing-commands'),
      outputFile: output
    })

    const generation = await generator.run()
    expect(Result.isOk(generation)).toBe(true)

    const generated = await Bun.file(output).text()
    expect(generated).toContain('const modules: Record<GeneratedNames, Command<any>> = {')

    await rm(testDir, { recursive: true, force: true })
  })
})
