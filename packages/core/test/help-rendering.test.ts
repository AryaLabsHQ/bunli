import { expect, test } from 'bun:test'
import { defineCommand } from '../src/index.js'
import { collectTopLevelCommands } from '../src/help/index.js'

test('collectTopLevelCommands matches string aliases exactly', () => {
  const build = defineCommand({
    name: 'b',
    alias: 'build',
    description: 'Build the project',
    handler: async () => {}
  })

  const commands = new Map([
    ['b', build],
    ['build', build]
  ])

  const topLevel = collectTopLevelCommands(commands)

  expect(topLevel).toHaveLength(1)
  expect(topLevel[0]?.name).toBe('b')
})
