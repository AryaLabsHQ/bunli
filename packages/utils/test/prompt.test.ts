import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import { confirm, multiselect, password, select } from '../src/prompt.js'
import { clack, CANCEL, PromptCancelledError } from '../src/prompts/clack.js'

function setClackValue(key: PropertyKey, value: unknown) {
  Reflect.set(clack, key, value)
}

describe('@bunli/utils prompt adapters', () => {
  const originalValues = new Map<PropertyKey, unknown>()

  beforeEach(() => {
    originalValues.set('confirm', clack.confirm)
    originalValues.set('select', clack.select)
    originalValues.set('multiselect', clack.multiselect)
    originalValues.set('password', clack.password)
    originalValues.set('cancel', clack.cancel)
  })

  afterEach(() => {
    for (const [key, value] of originalValues.entries()) {
      setClackValue(key, value)
    }
    originalValues.clear()
  })

  test('password preserves whitespace exactly', async () => {
    setClackValue('password', async () => '  secret  ')
    const value = await password('Password')
    expect(value).toBe('  secret  ')
  })

  test('password schema receives untrimmed input', async () => {
    setClackValue('password', async () => '  abc  ')

    const length = await password<number>('Password', {
      schema: z.string().transform((v) => v.length)
    })

    expect(length).toBe(7)
  })

  test('confirm throws PromptCancelledError on cancel', async () => {
    setClackValue('confirm', async () => CANCEL)
    setClackValue('cancel', () => CANCEL)

    await expect(confirm('Continue?')).rejects.toThrow(PromptCancelledError)
  })

  test('select forwards hint/disabled options and returns selected value', async () => {
    let capturedOptions: unknown

    setClackValue('select', async (args: { options: unknown }) => {
      capturedOptions = args.options
      return 'b'
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

    setClackValue('multiselect', async () => {
      const next = results[callIndex] ?? ['a']
      callIndex += 1
      return next
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
