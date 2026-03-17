import { describe, test, expect } from 'bun:test'
import { createCLI, defineCommand, defineGroup } from '../src/index.js'

describe('CLI alias routing', () => {
  test('routes subcommands through parent aliases', async () => {
    const invoked: string[] = []

    const migrateCommand = defineCommand({
      name: 'migrate',
      alias: 'm',
      description: 'Run migrations',
      handler: async () => {
        invoked.push('migrate')
      }
    })

    const databaseGroup = defineGroup({
      name: 'database',
      alias: 'db',
      description: 'Database commands',
      commands: [migrateCommand]
    })

    const cli = await createCLI({
      name: 'alias-cli',
      version: '0.0.0',
      plugins: []
    })

    cli.command(databaseGroup)

    await cli.execute('db migrate')
    await cli.execute('db m')

    expect(invoked).toEqual(['migrate', 'migrate'])
  })

  test('routes deep nested subcommands through chained aliases', async () => {
    const invoked: string[] = []

    const setCommand = defineCommand({
      name: 'set',
      alias: 's',
      description: 'Set value',
      handler: async () => {
        invoked.push('set')
      }
    })

    const profileGroup = defineGroup({
      name: 'profile',
      alias: 'p',
      description: 'Profile commands',
      commands: [setCommand]
    })

    const configGroup = defineGroup({
      name: 'config',
      alias: 'cfg',
      description: 'Config commands',
      commands: [profileGroup]
    })

    const cli = await createCLI({
      name: 'nested-alias-cli',
      version: '0.0.0',
      plugins: []
    })

    cli.command(configGroup)

    await cli.execute('cfg profile set')
    await cli.execute('cfg p s')

    expect(invoked).toEqual(['set', 'set'])
  })
})
