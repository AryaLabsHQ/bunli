import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import {
  confirm,
  multiselect,
  password,
  select,
  CANCEL,
  PromptCancelledError,
  __setPromptRuntimeForTests
} from '../src/prompt/index.js'

describe('@bunli/tui prompt adapters', () => {
  let restoreRuntime: (() => void) | null = null

  beforeEach(() => {
    restoreRuntime = null
  })

  afterEach(() => {
    restoreRuntime?.()
    restoreRuntime = null
  })

  test('password preserves whitespace exactly', async () => {
    restoreRuntime = __setPromptRuntimeForTests({ password: async () => '  secret  ' as string })
    const value = await password('Password')
    expect(value).toBe('  secret  ')
  })

  test('password schema receives untrimmed input', async () => {
    restoreRuntime = __setPromptRuntimeForTests({ password: async () => '  abc  ' as string })

    const length = await password<number>('Password', {
      schema: z.string().transform((v) => v.length)
    })

    expect(length).toBe(7)
  })

  test('confirm throws PromptCancelledError on cancel', async () => {
    restoreRuntime = __setPromptRuntimeForTests({
      confirm: async () => CANCEL,
      cancel: () => CANCEL
    })

    await expect(confirm('Continue?')).rejects.toThrow(PromptCancelledError)
  })

  test('select forwards hint/disabled options and returns selected value', async () => {
    let capturedOptions: unknown

    restoreRuntime = __setPromptRuntimeForTests({
      select: async (args: { options: unknown }) => {
        capturedOptions = args.options
        return 'b'
      }
    })

    const result = await select('Choose', {
      options: [
        { label: 'Option A', value: 'a', hint: 'first' },
        { label: 'Option B', value: 'b', disabled: true }
      ],
      default: 'a'
    })

    expect(result).toBe('b')
    expect(capturedOptions).toEqual([
      { label: 'Option A', value: 'a', hint: 'first' },
      { label: 'Option B', value: 'b', disabled: true }
    ])
  })

  test('multiselect retries until min/max constraints are satisfied', async () => {
    const results: Array<string[]> = [[], ['a', 'b'], ['a']]
    let callIndex = 0

    restoreRuntime = __setPromptRuntimeForTests({
      multiselect: async () => {
        const next = results[callIndex] ?? ['a']
        callIndex += 1
        return next
      }
    })

    const errors: string[] = []
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    }

    try {
      const picked = await multiselect('Choose features', {
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' }
        ],
        min: 1,
        max: 1
      })

      expect(picked).toEqual(['a'])
      expect(callIndex).toBe(3)
      expect(errors.length).toBe(2)
    } finally {
      console.error = originalConsoleError
    }
  })
})
