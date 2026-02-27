import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import {
  text,
  confirm,
  multiselect,
  password,
  select,
  CANCEL,
  PromptCancelledError,
  __setPromptRuntimeForTests,
  __promptInternalsForTests
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

  test('returns fallbackValue when prompt is unavailable', async () => {
    const value = await text('Name', {
      mode: 'inline',
      fallbackValue: 'fallback-user'
    })

    expect(value).toBe('fallback-user')
  })

  test('throws when prompt is unavailable and no fallbackValue is provided', async () => {
    const originalCI = process.env.CI
    process.env.CI = '1'

    try {
      await expect(text('Name', { mode: 'inline' })).rejects.toThrow(
        'Prompt requires an interactive terminal'
      )
    } finally {
      process.env.CI = originalCI
    }
  })

  test('select numeric shortcut helper resolves expected option', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c', disabled: true }
    ]

    const resolved = __promptInternalsForTests.resolveShortcutOption(
      { sequence: '2', name: '2' },
      options
    )

    expect(resolved?.value).toBe('b')
  })

  test('multiselect summary helper lists selected labels in option order', () => {
    const options = [
      { label: 'API', value: 'api' },
      { label: 'Web', value: 'web' },
      { label: 'Docs', value: 'docs' }
    ]

    const summary = __promptInternalsForTests.buildSelectedSummary(
      new Set(['docs', 'api']),
      options
    )

    expect(summary).toBe('API, Docs')
  })

  test('moveSelectableIndex skips disabled options', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
      { label: 'C', value: 'c' }
    ]

    const moved = __promptInternalsForTests.moveSelectableIndex(options, 0, 1)
    expect(moved).toBe(2)
  })

  test('password reveal key helper only matches Ctrl+R', () => {
    expect(__promptInternalsForTests.isPasswordRevealToggleKey({ ctrl: true, name: 'r' })).toBe(true)
    expect(__promptInternalsForTests.isPasswordRevealToggleKey({ name: 'r' })).toBe(false)
    expect(__promptInternalsForTests.isPasswordRevealToggleKey({ ctrl: true, name: 'c' })).toBe(false)
  })

  test('multiselect toggle key helper only matches space', () => {
    expect(__promptInternalsForTests.isMultiSelectToggleKey({ name: 'space' })).toBe(true)
    expect(__promptInternalsForTests.isMultiSelectToggleKey({ name: 'enter' })).toBe(false)
  })

  test('toggleSelection adds and removes option values', () => {
    const selected = new Set<string>()
    const option = { label: 'Docs', value: 'docs' }

    __promptInternalsForTests.toggleSelection(selected, option)
    expect(Array.from(selected)).toEqual(['docs'])

    __promptInternalsForTests.toggleSelection(selected, option)
    expect(Array.from(selected)).toEqual([])
  })

  test('cancel and submit key helpers match keyboard contracts', () => {
    expect(__promptInternalsForTests.isCancelKey({ ctrl: true, name: 'c' })).toBe(true)
    expect(__promptInternalsForTests.isCancelKey({ name: 'escape' })).toBe(true)
    expect(__promptInternalsForTests.isCancelKey({ name: 'q' })).toBe(false)

    expect(__promptInternalsForTests.isSubmitKey({ name: 'enter' })).toBe(true)
    expect(__promptInternalsForTests.isSubmitKey({ name: 'return' })).toBe(true)
    expect(__promptInternalsForTests.isSubmitKey({ name: 'linefeed' })).toBe(true)
    expect(__promptInternalsForTests.isSubmitKey({ name: 'space' })).toBe(false)
  })
})
