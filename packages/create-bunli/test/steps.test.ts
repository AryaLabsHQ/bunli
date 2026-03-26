import { expect, test } from 'bun:test'
import { getCommandSpawnArgs } from '../src/steps.js'

test('getCommandSpawnArgs uses sh on non-Windows platforms', () => {
  expect(getCommandSpawnArgs('echo hi', 'darwin')).toEqual(['sh', '-c', 'echo hi'])
})

test('getCommandSpawnArgs uses cmd on Windows', () => {
  expect(getCommandSpawnArgs('echo hi', 'win32')).toEqual(['cmd', '/d', '/s', '/c', 'echo hi'])
})
