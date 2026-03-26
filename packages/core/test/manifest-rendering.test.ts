import { describe, expect, test } from 'bun:test'
import { defineCommand, defineGroup, renderManifestFull, renderManifestIndex } from '../src/index.js'

describe('manifest rendering', () => {
  test('dedupes aliased top-level commands in manifest index', () => {
    const deploy = defineCommand({
      name: 'deploy',
      alias: 'd',
      description: 'Deploy the app',
      handler: async () => {}
    })

    const commands = new Map([
      ['deploy', deploy],
      ['d', deploy]
    ])

    const manifest = renderManifestIndex('demo', commands)

    expect(manifest).toContain('`demo deploy`')
    expect(manifest).not.toContain('`demo d`')
  })

  test('recurses through deep command trees in full manifest', () => {
    const setCommand = defineCommand({
      name: 'set',
      description: 'Set a value',
      handler: async () => {}
    })

    const profileGroup = defineGroup({
      name: 'profile',
      description: 'Profile commands',
      commands: [setCommand]
    })

    const configGroup = defineGroup({
      name: 'config',
      description: 'Config commands',
      commands: [profileGroup]
    })

    const commands = new Map([
      ['config', configGroup]
    ])

    const manifest = renderManifestFull('demo', commands)

    expect(manifest).toContain('## demo config')
    expect(manifest).toContain('## demo config profile')
    expect(manifest).toContain('## demo config profile set')
  })

  test('uses a single blank line between the root heading and description in full manifests', () => {
    const hello = defineCommand({
      name: 'hello',
      description: 'Say hello',
      handler: async () => {}
    })

    const commands = new Map([
      ['hello', hello]
    ])

    const manifest = renderManifestFull('demo', commands, 'CLI description')

    expect(manifest).toContain('# demo\n\nCLI description\n\n## demo hello')
    expect(manifest).not.toContain('# demo\n\n\n')
  })
})
