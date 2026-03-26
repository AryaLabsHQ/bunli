import { expect, test } from 'bun:test'
import { testPluginHooks } from '../src/plugin/testing.js'

test('testPluginHooks reuses execution state across preRun and postRun', async () => {
  const plugin = {
    name: 'shared-state-test',
    async preRun(_context: unknown, state: { set(key: string, value: unknown): void }) {
      state.set('token', 'abc123')
    },
    async postRun(_context: unknown, state: { get(key: string): unknown }) {
      expect(state.get('token')).toBe('abc123')
    }
  }

  const results = await testPluginHooks(plugin)

  expect(results.preRun?.success).toBe(true)
  expect(results.postRun?.success).toBe(true)
})

test('testPluginHooks reuses the same command context across preRun and postRun', async () => {
  const plugin = {
    name: 'shared-context-test',
    async preRun(context: Record<string, unknown>) {
      context.marker = 'persisted'
    },
    async postRun(context: Record<string, unknown>) {
      expect(context.marker).toBe('persisted')
    }
  }

  const results = await testPluginHooks(plugin)

  expect(results.preRun?.success).toBe(true)
  expect(results.postRun?.success).toBe(true)
  expect(results.preRun?.context).toBe(results.postRun?.context)
})
