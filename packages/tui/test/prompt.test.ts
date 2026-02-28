import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import { displayWidth } from '../src/components/text-layout.js'
import {
  text,
  confirm,
  multiselect,
  password,
  select,
  log as promptLog,
  rawSpinner,
  CANCEL,
  PromptCancelledError,
  __setPromptRuntimeForTests,
  __promptInternalsForTests
} from '../src/prompt/index.js'

describe('@bunli/tui prompt adapters', () => {
  let restoreRuntime: (() => void) | null = null
  const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, '')

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

  test('log export respects runtime overrides', () => {
    const messages: string[] = []
    restoreRuntime = __setPromptRuntimeForTests({
      log: {
        info(message) {
          messages.push(`info:${message}`)
        },
        success(message) {
          messages.push(`success:${message}`)
        },
        warn(message) {
          messages.push(`warn:${message}`)
        },
        error(message) {
          messages.push(`error:${message}`)
        }
      }
    })

    promptLog.info('hello')
    promptLog.error('oops')
    expect(messages).toEqual(['info:hello', 'error:oops'])
  })

  test('formatQuestionLabel includes prompt symbol and message', () => {
    const line = __promptInternalsForTests.formatQuestionLabel('Project name')
    expect(line).toContain('?')
    expect(line).toContain('Project name')
  })

  test('formatQuestionLabel keeps leading line breaks before the prompt symbol', () => {
    const line = stripAnsi(__promptInternalsForTests.formatQuestionLabel('\nDeploy to staging?'))
    expect(line).toBe('\n? Deploy to staging?')
  })

  test('intro/outro formatting helpers produce section-style labels', () => {
    const intro = stripAnsi(__promptInternalsForTests.formatIntroLine('Project Setup Wizard'))
    const outro = stripAnsi(__promptInternalsForTests.formatOutroLine('Project created successfully'))

    expect(intro).toContain('Project Setup Wizard')
    expect(intro).toMatch(/^[┌+]\s{2}Project Setup Wizard\n[│|]/)
    expect(outro).toContain('Project created successfully')
    expect(outro).toMatch(/^[└+]\s{2}Project created successfully/)
  })

  test('note formatter renders titled multi-line blocks with prefixed body lines', () => {
    const lines = __promptInternalsForTests.formatNoteLines(
      'Name: hello\nType: library\nFramework: node',
      'Configuration Summary'
    )

    const output = stripAnsi(lines.join('\n'))
    expect(output).toContain('Configuration Summary')
    expect(output).toMatch(/\|\s+Name\s+: hello/)
    expect(output).toMatch(/\|\s+Type\s+: library/)
    expect(output).toMatch(/\|\s+Framework\s+: node/)
    expect(output).toMatch(/[╮+]/)
    expect(output).toMatch(/[╯+]/)

    const tableLines = output
      .split('\n')
      .filter((line) => line.startsWith('| ') && line.includes(':'))
    const colonColumns = tableLines.map((line) => line.indexOf(':'))
    expect(new Set(colonColumns).size).toBe(1)

    const widths = lines.map((line) => displayWidth(stripAnsi(line)))
    expect(new Set(widths).size).toBe(1)
  })

  test('renderSelectFrame marks active and disabled options', () => {
    const lines = __promptInternalsForTests.renderSelectFrame({
      message: 'Choose one',
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b', disabled: true }
      ],
      selectedIndex: 0
    })

    expect(lines.length).toBeGreaterThanOrEqual(4)
    expect(lines.join('\n')).toContain('Choose one')
    expect(lines.join('\n')).toContain('[disabled]')
  })

  test('renderMultiSelectFrame renders checkbox states and selected summary', () => {
    const lines = __promptInternalsForTests.renderMultiSelectFrame({
      message: 'Pick features',
      options: [
        { label: 'Testing', value: 'testing' },
        { label: 'Linting', value: 'linting' }
      ],
      selectedIndex: 1,
      selected: new Set(['testing'])
    })

    const output = lines.join('\n')
    expect(output).toContain('Pick features')
    expect(output).toContain('[x]')
    expect(output).toContain('Selected: Testing')
  })

  test('non-tty matrix honors interactive mode, CI, and fallback contracts', () => {
    expect(
      __promptInternalsForTests.canPromptInEnvironment('inline', {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: {}
      })
    ).toBe(true)

    expect(
      __promptInternalsForTests.canPromptInEnvironment('inline', {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: { CI: '1' }
      })
    ).toBe(false)

    expect(
      __promptInternalsForTests.canPromptInEnvironment('interactive', {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        env: { CI: '1' }
      })
    ).toBe(true)

    expect(
      __promptInternalsForTests.canPromptInEnvironment('interactive', {
        stdinIsTTY: false,
        stdoutIsTTY: true,
        env: {}
      })
    ).toBe(false)
  })

  test('renderSelectFrame matches golden output shape', () => {
    const output = stripAnsi(__promptInternalsForTests.renderSelectFrame({
      message: 'Environment',
      options: [
        { label: 'Dev', value: 'dev' },
        { label: 'Prod', value: 'prod', hint: 'danger', disabled: true }
      ],
      selectedIndex: 0
    }).join('\n'))

    expect(output).toBe(
      [
        '? Environment',
        'Use Up/Down, Enter to choose, 1-2 for shortcuts',
        '| > 1. Dev',
        '|   2. Prod (danger) [disabled]'
      ].join('\n')
    )
  })

  test('renderMultiSelectFrame matches golden output shape', () => {
    const output = stripAnsi(__promptInternalsForTests.renderMultiSelectFrame({
      message: 'Features',
      options: [
        { label: 'TypeScript', value: 'ts' },
        { label: 'Docker', value: 'docker' }
      ],
      selectedIndex: 1,
      selected: new Set(['docker']),
      errorMessage: 'Select at least one option.'
    }).join('\n'))

    expect(output).toBe(
      [
        '? Features',
        'Use Up/Down, Space to toggle, Enter to submit, 1-2 shortcuts',
        'ERR Select at least one option.',
        '|   1. [ ] TypeScript',
        '| > 2. [x] Docker',
        'Selected: Docker'
      ].join('\n')
    )
  })

  test('renderSelectFrame alternates active pointer for subtle motion', () => {
    const firstOutput = stripAnsi(__promptInternalsForTests.renderSelectFrame({
      message: 'Environment',
      options: [{ label: 'Dev', value: 'dev' }],
      selectedIndex: 0,
      tick: 0
    }).join('\n'))

    const secondOutput = stripAnsi(__promptInternalsForTests.renderSelectFrame({
      message: 'Environment',
      options: [{ label: 'Dev', value: 'dev' }],
      selectedIndex: 0,
      tick: 1
    }).join('\n'))

    const firstLine = firstOutput.split('\n')[2]
    const secondLine = secondOutput.split('\n')[2]

    expect(firstLine).toContain('| ')
    expect(secondLine).toContain('| ')
    expect(firstLine).not.toBe(secondLine)
  })

  test('symbol mode resolver honors explicit env override and non-tty fallback', () => {
    expect(__promptInternalsForTests.resolvePromptSymbolMode({ BUNLI_TUI_SYMBOLS: 'ascii' })).toBe('ascii')
    expect(__promptInternalsForTests.resolvePromptSymbolMode({ BUNLI_SYMBOLS: 'unicode' })).toBe('unicode')
  })

  test('simulateSelectKeySequence covers realistic key navigation and submit', () => {
    const result = __promptInternalsForTests.simulateSelectKeySequence({
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' }
      ],
      keys: [{ name: 'down' }, { name: 'down' }, { name: 'enter' }]
    })

    expect(result.result).toBe('c')
    expect(result.selectedIndex).toBe(2)
  })

  test('simulateSelectKeySequence supports cancellation', () => {
    const result = __promptInternalsForTests.simulateSelectKeySequence({
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' }
      ],
      keys: [{ name: 'escape' }]
    })

    expect(result.result).toBe(CANCEL)
  })

  test('simulateMultiSelectKeySequence enforces required state and then succeeds', () => {
    const state = __promptInternalsForTests.simulateMultiSelectKeySequence({
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' }
      ],
      required: true,
      keys: [
        { name: 'enter' },
        { name: 'space' },
        { name: 'down' },
        { name: 'space' },
        { name: 'enter' }
      ]
    })

    expect(state.result).toEqual(['a', 'b'])
    expect(state.errorMessage).toBeUndefined()
  })

  test('simulatePasswordKeySequence handles reveal toggle, backspace, and submit', () => {
    const result = __promptInternalsForTests.simulatePasswordKeySequence({
      keys: [
        { sequence: 's', name: 's' },
        { sequence: 'e', name: 'e' },
        { sequence: 'c', name: 'c' },
        { ctrl: true, name: 'r' },
        { name: 'backspace' },
        { sequence: 't', name: 't' },
        { name: 'enter' }
      ]
    })

    expect(result.revealed).toBe(true)
    expect(result.result).toBe('set')
  })

  test('simulatePasswordKeySequence accepts pasted multi-character input', () => {
    const result = __promptInternalsForTests.simulatePasswordKeySequence({
      keys: [
        { sequence: 'super-secret-token', name: undefined },
        { name: 'enter' }
      ]
    })

    expect(result.result).toBe('super-secret-token')
  })

  test('resolveTextInput strips bracketed paste markers and newlines', () => {
    const parsed = __promptInternalsForTests.resolveTextInput(
      '\u001b[200~top\nsecret\r\nvalue\u001b[201~'
    )

    expect(parsed).toBe('topsecretvalue')
  })

  test('renderFrame clears prior frame lines and does not leave dangling escape prefixes', () => {
    const writes: string[] = []
    const originalWrite = process.stdout.write

    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }) as typeof process.stdout.write

    try {
      const first = __promptInternalsForTests.renderFrame(['first', 'frame'], 0)
      __promptInternalsForTests.renderFrame(['second'], first)
    } finally {
      process.stdout.write = originalWrite
    }

    const output = writes.join('')
    expect(output).toContain('\x1b[2A')
    expect(output).toContain('\x1b[J')
    expect(/\x1b\[[0-9;]*$/.test(output)).toBe(false)
  })

  test('spinner in non-tty mode never writes raw ANSI control fragments', () => {
    const writes: string[] = []
    const logs: string[] = []
    const originalWrite = process.stdout.write
    const originalTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
    const originalLog = console.log

    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }) as typeof process.stdout.write

    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: false
    })

    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    }

    try {
      const spinner = rawSpinner()
      spinner.start('Downloading')
      spinner.message('Extracting')
      spinner.stop('Complete')
    } finally {
      process.stdout.write = originalWrite
      console.log = originalLog
      if (originalTTYDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', originalTTYDescriptor)
      }
    }

    expect(logs.some((entry) => entry.includes('Downloading'))).toBe(true)
    expect(logs.some((entry) => entry.includes('Extracting'))).toBe(true)
    expect(logs.some((entry) => entry.includes('Complete'))).toBe(true)
    expect(writes.join('')).not.toContain('\x1b[2K')
  })
})
