/** @jsxImportSource @opentui/react */
import { appendFileSync } from 'node:fs'
import { createCliRenderer, CliRenderEvents } from '@opentui/core'
import { createRoot, useKeyboard } from '@opentui/react'
import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { KeyEvent } from '@opentui/core'
import { Menu } from '../components/menu.js'
import { ThemeProvider } from '../components/theme.js'
import { createKeyMatcher } from '../components/keymap.js'
import { formatFixedWidth } from '../components/text-layout.js'

const OPEN_TUI_CANCEL = Symbol.for('bunli:prompt_cancel')
const DEBUG_INPUT_FILE = (
  process.env.BUNLI_TUI_DEBUG_INPUT_FILE
  ?? process.env.BUNLI_TUI_DEBUG_LOG_FILE
  ?? ''
).trim()
const DEBUG_STDERR = process.env.BUNLI_TUI_DEBUG_INPUT === '1'
const DEBUG_VERBOSE = process.env.BUNLI_TUI_DEBUG_VERBOSE === '1'
const DEBUG_INPUTS = DEBUG_STDERR || DEBUG_INPUT_FILE.length > 0

type OpenTuiCancel = typeof OPEN_TUI_CANCEL

interface OpenTuiPromptShellProps {
  children: ReactNode
}

function colorizeAnsi(text: string, code: number): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return text
  return `\x1b[${code}m${text}\x1b[0m`
}

function formatDebugSequence(sequence: string): string {
  return sequence
    .replace(/\u001b/g, '\\u001b')
    .replace(/\u0003/g, '\\u0003')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}

function isEscapeRawSequence(sequence: string): boolean {
  if (sequence === '\u001b' || sequence === '\u001b\u001b' || sequence === '\u001b[27u') return true
  return /^\u001b\[27;\d+;27~$/.test(sequence)
}

function isCtrlCRawSequence(sequence: string): boolean {
  return sequence === '\u0003'
}

function debugInput(message: string) {
  if (!DEBUG_INPUTS) return
  const line = `[${new Date().toISOString()} pid=${process.pid}] [bunli:tui:input] ${message}`
  if (DEBUG_STDERR) {
    process.stderr.write(`${line}\n`)
  }
  if (DEBUG_INPUT_FILE.length > 0) {
    try {
      appendFileSync(DEBUG_INPUT_FILE, `${line}\n`)
    } catch {
      // Avoid crashing prompt runtime on debug logging failures.
    }
  }
}

function shouldLogRawSequence(sequence: string): boolean {
  if (DEBUG_VERBOSE) return true
  return isEscapeRawSequence(sequence) || isCtrlCRawSequence(sequence)
}

function formatHistoryLineForStdout(line: string): string {
  if (line.length === 0) return line
  if (line.startsWith('● ')) return colorizeAnsi(line, 96)
  if (line.startsWith('◇ ')) return colorizeAnsi(line, 36)
  if (line.startsWith('┌ ') || line.startsWith('└ ')) return colorizeAnsi(line, 36)
  if (line.startsWith('OK ')) return colorizeAnsi(line, 32)
  if (line.startsWith('WARN ')) return colorizeAnsi(line, 33)
  if (line.startsWith('ERR ')) return colorizeAnsi(line, 31)
  if (line.startsWith('INFO ')) return colorizeAnsi(line, 36)
  if (line.startsWith('│ ')) {
    return `${colorizeAnsi('│', 90)} ${line.slice(2)}`
  }
  if (line.startsWith('? ')) {
    return `${colorizeAnsi('?', 36)} ${line.slice(2)}`
  }
  return line
}

function historyLineColor(line: string): string {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('? ')) return '#f4f7fb'
  if (trimmed.startsWith('OK ')) return '#38d49c'
  if (trimmed.startsWith('WARN ')) return '#f9c85b'
  if (trimmed.startsWith('ERR ')) return '#ff6b6b'
  if (trimmed.startsWith('INFO ')) return '#6ac4ff'
  if (trimmed.startsWith('● ')) return '#6ac4ff'
  if (trimmed.startsWith('◇ ')) return '#6ac4ff'
  if (trimmed.startsWith('┌ ') || trimmed.startsWith('└ ')) return '#6ac4ff'
  if (trimmed.startsWith('│ ')) return '#8fa1b5'
  return '#8fa1b5'
}

function OpenTuiPromptShell({ children }: OpenTuiPromptShellProps) {
  return (
    <ThemeProvider theme='dark'>
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {children}
      </box>
    </ThemeProvider>
  )
}

type PromptResolver<T> = (value: T | OpenTuiCancel) => void

const promptKeymap = createKeyMatcher({
  cancel: ['escape', 'ctrl+c'],
  up: ['up', 'k'],
  down: ['down', 'j'],
  toggle: ['space'],
  submit: ['enter']
})

function isCancelKeyboardEvent(event: KeyEvent): boolean {
  return isEscapeKeyboardEvent(event) || isCtrlCKeyboardEvent(event)
}

function isEscapeKeyboardEvent(event: KeyEvent): boolean {
  const keyName = event.name?.toLowerCase()
  const keyCode = event.code?.toLowerCase()
  const sequence = event.sequence ?? ''
  if (keyName === 'escape' || keyName === 'esc') return true
  if (keyCode === 'escape') return true
  if (isEscapeRawSequence(sequence)) return true
  return false
}

function isCtrlCKeyboardEvent(event: KeyEvent): boolean {
  const keyName = event.name?.toLowerCase()
  const sequence = event.sequence ?? ''
  if (isCtrlCRawSequence(sequence)) return true
  if (event.ctrl && (keyName === 'c' || sequence.toLowerCase() === 'c')) return true
  if (promptKeymap.match('cancel', event) && event.ctrl) return true
  return false
}

function emitInterruptSignal(source: string) {
  debugInput(`interrupt source="${source}"`)
  if (process.stdout.isTTY) process.stdout.write('\n')
  process.kill(process.pid, 'SIGINT')
}

function useCancelKey(onCancel: () => void) {
  useKeyboard((event) => {
    if (!isCancelKeyboardEvent(event)) return
    event.preventDefault?.()
    event.stopPropagation?.()
    if (isCtrlCKeyboardEvent(event)) {
      emitInterruptSignal('useCancelKey')
      return
    }
    onCancel()
  })
}

interface PromptCancelBoundaryProps {
  onCancel: () => void
  children: ReactNode
}

function PromptCancelBoundary({ onCancel, children }: PromptCancelBoundaryProps) {
  useKeyboard((event) => {
    if (!isCancelKeyboardEvent(event)) return
    event.preventDefault?.()
    event.stopPropagation?.()
    if (isCtrlCKeyboardEvent(event)) {
      emitInterruptSignal('promptBoundary')
      return
    }
    onCancel()
  })
  return <>{children}</>
}

interface TextPromptViewProps {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | undefined
  inline?: boolean
  hint?: string
  resolve: PromptResolver<string>
}

function TextPromptView({
  message,
  placeholder,
  defaultValue = '',
  validate,
  inline = false,
  hint = 'Enter submit • Esc cancel',
  resolve
}: TextPromptViewProps) {
  const [value, setValue] = useState(defaultValue)
  const valueRef = useRef(defaultValue)
  const [error, setError] = useState<string | undefined>()

  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      {inline
        ? (
          <box style={{ flexDirection: 'row' }}>
            <text content={`? ${message} `} />
            <input
              value={value}
              placeholder={placeholder}
              focused
              onInput={(next) => {
                setValue(next)
                valueRef.current = next
                if (error) setError(undefined)
              }}
              onSubmit={(submitted) => {
                const submittedValue = typeof submitted === 'string' ? submitted : valueRef.current
                const validationError = validate?.(submittedValue)
                if (validationError) {
                  setError(validationError)
                  return
                }
                resolve(submittedValue)
              }}
            />
          </box>
          )
        : (
          <>
            <text content={`? ${message}`} />
            <input
              value={value}
              placeholder={placeholder}
              focused
              onInput={(next) => {
                setValue(next)
                valueRef.current = next
                if (error) setError(undefined)
              }}
              onSubmit={(submitted) => {
                const submittedValue = typeof submitted === 'string' ? submitted : valueRef.current
                const validationError = validate?.(submittedValue)
                if (validationError) {
                  setError(validationError)
                  return
                }
                resolve(submittedValue)
              }}
            />
          </>
          )}
      {error ? <text content={`ERR ${error}`} fg='#ff6b6b' /> : <text content={hint} fg='#8fa1b5' />}
    </box>
  )
}

interface ConfirmPromptViewProps {
  message: string
  initialValue?: boolean
  resolve: PromptResolver<boolean>
}

function ConfirmPromptView({ message, initialValue = false, resolve }: ConfirmPromptViewProps) {
  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <Menu
        title='Choose'
        boxed={false}
        initialIndex={initialValue ? 0 : 1}
        items={[
          { key: 'yes', label: 'Yes' },
          { key: 'no', label: 'No' }
        ]}
        onSelect={(key) => resolve(key === 'yes')}
        onKeyPress={(event) => {
          if (isCtrlCKeyboardEvent(event)) {
            event.preventDefault?.()
            event.stopPropagation?.()
            emitInterruptSignal('confirmMenu')
            return true
          }
          if (isEscapeKeyboardEvent(event)) {
            event.preventDefault?.()
            event.stopPropagation?.()
            resolve(OPEN_TUI_CANCEL)
            return true
          }
          const sequence = (event.sequence ?? '').toLowerCase()
          if (sequence === 'y') {
            event.preventDefault?.()
            event.stopPropagation?.()
            resolve(true)
            return true
          }
          if (sequence === 'n') {
            event.preventDefault?.()
            event.stopPropagation?.()
            resolve(false)
            return true
          }
          return false
        }}
      />
      <text content='Up/Down or y/n • Enter submit • Esc cancel' fg='#8fa1b5' />
    </box>
  )
}

export interface OpenTuiSelectOption<T = string> {
  label: string
  value: T
  hint?: string
  disabled?: boolean
}

interface SelectPromptViewProps<T = string> {
  message: string
  options: OpenTuiSelectOption<T>[]
  initialValue?: T
  resolve: PromptResolver<T>
}

function SelectPromptView<T = string>({
  message,
  options,
  initialValue,
  resolve
}: SelectPromptViewProps<T>) {
  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  const initialIndex = useMemo(() => {
    if (initialValue !== undefined) {
      const index = options.findIndex((entry) => entry.value === initialValue && !entry.disabled)
      if (index >= 0) return index
    }
    return Math.max(0, options.findIndex((entry) => !entry.disabled))
  }, [initialValue, options])

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <Menu
        title='Options'
        initialIndex={initialIndex}
        boxed={false}
        items={options.map((entry, index) => ({
          key: String(index),
          label: entry.label,
          description: entry.hint,
          disabled: entry.disabled
        }))}
        onSelect={(key) => {
          const index = Number.parseInt(key, 10)
          const picked = options[index]
          if (!picked || picked.disabled) return
          resolve(picked.value)
        }}
        onKeyPress={(event) => {
          if (isCtrlCKeyboardEvent(event)) {
            event.preventDefault?.()
            event.stopPropagation?.()
            emitInterruptSignal('selectMenu')
            return true
          }
          if (isEscapeKeyboardEvent(event)) {
            event.preventDefault?.()
            event.stopPropagation?.()
            resolve(OPEN_TUI_CANCEL)
            return true
          }
          return false
        }}
      />
      <text content='Enter select • Esc cancel' fg='#8fa1b5' />
    </box>
  )
}

interface MultiSelectPromptViewProps<T = string> {
  message: string
  options: OpenTuiSelectOption<T>[]
  initialValues?: T[]
  required?: boolean
  resolve: PromptResolver<T[]>
}

function findNextEnabledIndex<T>(options: OpenTuiSelectOption<T>[], from: number, delta: number): number {
  if (options.length === 0) return 0
  for (let step = 0; step < options.length; step += 1) {
    const next = (from + delta * (step + 1) + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return from
}

function MultiSelectPromptView<T = string>({
  message,
  options,
  initialValues = [],
  required = false,
  resolve
}: MultiSelectPromptViewProps<T>) {
  const [selected, setSelected] = useState<Set<T>>(new Set(initialValues))
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((entry) => !entry.disabled)))
  const [error, setError] = useState<string | undefined>()

  useKeyboard((event) => {
    if (isCancelKeyboardEvent(event)) {
      event.preventDefault?.()
      event.stopPropagation?.()
      if (isCtrlCKeyboardEvent(event)) {
        emitInterruptSignal('multiselect')
        return
      }
      resolve(OPEN_TUI_CANCEL)
      return
    }
    if (promptKeymap.match('up', event)) {
      setActiveIndex((prev) => findNextEnabledIndex(options, prev, -1))
      return
    }

    if (promptKeymap.match('down', event)) {
      setActiveIndex((prev) => findNextEnabledIndex(options, prev, 1))
      return
    }

    if (promptKeymap.match('toggle', event)) {
      const option = options[activeIndex]
      if (!option || option.disabled) return
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(option.value)) next.delete(option.value)
        else next.add(option.value)
        return next
      })
      setError(undefined)
      return
    }

    if (promptKeymap.match('submit', event)) {
      const values = options
        .filter((entry) => selected.has(entry.value))
        .map((entry) => entry.value)

      if (required && values.length === 0) {
        setError('Select at least one option.')
        return
      }

      resolve(values)
    }
  })

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {options.map((entry, index) => {
          const focused = index === activeIndex
          const picked = selected.has(entry.value)
          const hint = entry.hint ? ` (${entry.hint})` : ''
          const disabled = entry.disabled ? ' [disabled]' : ''
          return (
            <text
              key={String(index)}
              content={`${focused ? '>' : ' '} ${picked ? '[x]' : '[ ]'} ${entry.label}${hint}${disabled}`}
              fg={entry.disabled ? '#8fa1b5' : focused ? '#6ac4ff' : '#f4f7fb'}
            />
          )
        })}
      </box>
      {error ? <text content={`ERR ${error}`} fg='#ff6b6b' /> : <text content='Space toggle • Enter submit • Esc cancel' fg='#8fa1b5' />}
    </box>
  )
}

interface RunPromptArgs<T> {
  render: (resolve: PromptResolver<T>) => React.ReactNode
  formatHistoryLine?: (value: T) => string | undefined
}

interface HistoryEntry {
  key?: string
  lines: string[]
}

export interface OpenTuiRendererSession {
  initialize: () => Promise<void>
  runPrompt: <T>(args: RunPromptArgs<T>) => Promise<T | OpenTuiCancel>
  appendHistoryLines: (lines: string[]) => void
  setHistorySection: (key: string, lines: string[]) => void
  renderStatusLine: (content: string, fg?: string) => void
  clearStatusLine: () => void
  flushHistoryToStdout: () => void
  dispose: () => Promise<void>
}

export function createOpenTuiRendererSession(): OpenTuiRendererSession {
  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | undefined
  let initializePromise: Promise<void> | undefined
  let statusRoot: ReturnType<typeof createRoot> | undefined
  let promptRoot: ReturnType<typeof createRoot> | undefined
  let promptRender: (() => void) | undefined
  let activePromptCancel: (() => void) | undefined
  let rawCancelHandlerInstalled = false
  const historyEntries: HistoryEntry[] = []
  let statusLine: { content: string; fg: string } | undefined

  const historyLines = () => historyEntries.flatMap((entry) => entry.lines)
  const historyRenderLines = () => {
    const width = Math.max(1, (process.stdout.columns ?? 80) - 1)
    return historyLines().map((line) => formatFixedWidth(line, width, { overflow: 'clip' }))
  }
  const initialize = async () => {
    if (renderer?.isDestroyed) {
      renderer = undefined
      initializePromise = undefined
    }
    if (renderer) return
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      renderer = await createCliRenderer({
        useAlternateScreen: false,
        useConsole: false,
        exitOnCtrlC: false,
        targetFps: 30,
        useMouse: false
      })
      renderer.disableStdoutInterception()
      if (!rawCancelHandlerInstalled) {
        rawCancelHandlerInstalled = true
        renderer.prependInputHandler((sequence) => {
          if (shouldLogRawSequence(sequence)) {
            debugInput(`raw seq="${formatDebugSequence(sequence)}" activePrompt=${Boolean(activePromptCancel)}`)
          }
          if (!isEscapeRawSequence(sequence) && !isCtrlCRawSequence(sequence)) return false
          if (isCtrlCRawSequence(sequence)) {
            emitInterruptSignal('raw')
            return true
          }
          if (activePromptCancel) {
            activePromptCancel()
            return true
          }
          if (isEscapeRawSequence(sequence)) return false
          return false
        })
      }
    })()

    await initializePromise
  }

  const clearStatusLine = () => {
    statusLine = undefined
    if (!statusRoot) return
    statusRoot.unmount()
    statusRoot = undefined
  }

  const appendHistoryLines = (lines: string[]) => {
    if (lines.length === 0) return
    historyEntries.push({ lines: [...lines] })
    promptRender?.()
    const linesToRender = historyRenderLines()
    if (statusRoot && statusLine) {
      const width = Math.max(1, (process.stdout.columns ?? 80) - 1)
      statusRoot.render(
        <OpenTuiPromptShell>
          <box style={{ flexDirection: 'column', gap: 0 }}>
            {linesToRender.map((line, index) => (
              <text key={`history:${index}`} content={line} fg={historyLineColor(line)} />
            ))}
            <text content={formatFixedWidth(statusLine.content, width, { overflow: 'clip' })} fg={statusLine.fg} />
          </box>
        </OpenTuiPromptShell>
      )
    }
  }

  const setHistorySection = (key: string, lines: string[]) => {
    const index = historyEntries.findIndex((entry) => entry.key === key)
    if (index >= 0) {
      if (lines.length === 0) {
        historyEntries.splice(index, 1)
      } else {
        historyEntries[index] = { key, lines: [...lines] }
      }
    } else if (lines.length > 0) {
      historyEntries.push({ key, lines: [...lines] })
    }
    promptRender?.()
  }

  const renderStatusLine = (content: string, fg = '#8fa1b5') => {
    statusLine = { content, fg }
    void (async () => {
      await initialize()
      const activeRenderer = renderer
      if (!activeRenderer || !statusLine) return

      const root = statusRoot ?? createRoot(activeRenderer)
      statusRoot = root
      const linesToRender = historyRenderLines()
      const width = Math.max(1, (process.stdout.columns ?? 80) - 1)
      root.render(
        <OpenTuiPromptShell>
          <box style={{ flexDirection: 'column', gap: 0 }}>
            {linesToRender.map((line, index) => (
              <text key={`history:${index}`} content={line} fg={historyLineColor(line)} />
            ))}
            <text content={formatFixedWidth(statusLine.content, width, { overflow: 'clip' })} fg={statusLine.fg} />
          </box>
        </OpenTuiPromptShell>
      )
    })()
  }

  const flushHistoryToStdout = () => {
    const linesToWrite = historyLines()
    if (linesToWrite.length === 0) return
    for (const line of linesToWrite) {
      process.stdout.write(`${formatHistoryLineForStdout(line)}\n`)
    }
    historyEntries.length = 0
  }

  async function runPrompt<T>(args: RunPromptArgs<T>): Promise<T | OpenTuiCancel> {
    await initialize()
    const activeRenderer = renderer
    if (!activeRenderer) return OPEN_TUI_CANCEL
    clearStatusLine()
    const root = createRoot(activeRenderer)
    promptRoot = root

    return await new Promise<T | OpenTuiCancel>((resolve) => {
      let settled = false
      let cleanedUp = false
      const onSigint = () => settle(OPEN_TUI_CANCEL)
      const onGlobalKeypress = (event: KeyEvent) => {
        const cancelMatch = isCancelKeyboardEvent(event)
        if (cancelMatch || DEBUG_VERBOSE) {
          debugInput(
            `keypress name="${event.name ?? ''}" seq="${formatDebugSequence(event.sequence ?? '')}" ctrl=${Boolean(event.ctrl)} meta=${Boolean(event.meta)} shift=${Boolean(event.shift)} cancel=${cancelMatch}`
          )
        }
        if (!cancelMatch) return
        event.preventDefault?.()
        event.stopPropagation?.()
        if (isCtrlCKeyboardEvent(event)) {
          emitInterruptSignal('globalKeypress')
          return
        }
        settle(OPEN_TUI_CANCEL)
      }

      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        if (activePromptCancel === onSigint) {
          activePromptCancel = undefined
        }
        process.off('SIGINT', onSigint)
        activeRenderer.keyInput.off('keypress', onGlobalKeypress)
        promptRender = undefined
        promptRoot = undefined
        root.unmount()
      }

      const settle: PromptResolver<T> = (value) => {
        if (settled) return
        settled = true
        if (value !== OPEN_TUI_CANCEL) {
          const historyLine = args.formatHistoryLine?.(value as T)
          if (historyLine) appendHistoryLines([historyLine])
        }
        cleanup()
        resolve(value)
      }

      activeRenderer.once(CliRenderEvents.DESTROY, () => {
        if (!settled) {
          settled = true
          cleanup()
          resolve(OPEN_TUI_CANCEL)
        }
      })
      process.on('SIGINT', onSigint)
      activeRenderer.keyInput.on('keypress', onGlobalKeypress)
      activePromptCancel = onSigint

      promptRender = () => {
        const linesToRender = historyRenderLines()
        root.render(
          <OpenTuiPromptShell>
            <box style={{ flexDirection: 'column', gap: 0 }}>
              {linesToRender.map((line, index) => (
                <text key={`history:${index}`} content={line} fg={historyLineColor(line)} />
              ))}
              <PromptCancelBoundary onCancel={() => settle(OPEN_TUI_CANCEL)}>
                {args.render(settle)}
              </PromptCancelBoundary>
            </box>
          </OpenTuiPromptShell>
        )
      }
      promptRender()
    })
  }

  const dispose = async () => {
    clearStatusLine()
    promptRender = undefined
    promptRoot?.unmount()
    promptRoot = undefined
    if (!renderer) return
    if (!renderer.isDestroyed) {
      renderer.currentRenderBuffer.clear()
      renderer.nextRenderBuffer.clear()
      renderer.requestRender()
      await renderer.idle()
    }
    if (!renderer.isDestroyed) renderer.destroy()
    renderer = undefined
    initializePromise = undefined
  }

  return {
    initialize,
    runPrompt,
    appendHistoryLines,
    setHistorySection,
    renderStatusLine,
    clearStatusLine,
    flushHistoryToStdout,
    dispose
  }
}

async function runOpenTuiPrompt<T>(
  args: RunPromptArgs<T>,
  session?: OpenTuiRendererSession
): Promise<T | OpenTuiCancel> {
  if (session) return session.runPrompt(args)
  const tempSession = createOpenTuiRendererSession()
  try {
    await tempSession.initialize()
    return await tempSession.runPrompt(args)
  } finally {
    await tempSession.dispose()
  }
}

export async function runOpenTuiTextPrompt(args: {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | undefined
  inline?: boolean
  hint?: string
  formatHistoryLine?: (value: string) => string | undefined
}, session?: OpenTuiRendererSession): Promise<string | OpenTuiCancel> {
  return runOpenTuiPrompt({
    formatHistoryLine: args.formatHistoryLine,
    render: (resolve) => (
      <TextPromptView
        message={args.message}
        placeholder={args.placeholder}
        defaultValue={args.defaultValue}
        validate={args.validate}
        inline={args.inline}
        hint={args.hint}
        resolve={resolve}
      />
    )
  }, session)
}

export async function runOpenTuiConfirmPrompt(args: {
  message: string
  initialValue?: boolean
  formatHistoryLine?: (value: boolean) => string | undefined
}, session?: OpenTuiRendererSession): Promise<boolean | OpenTuiCancel> {
  return runOpenTuiPrompt({
    formatHistoryLine: args.formatHistoryLine,
    render: (resolve) => (
      <ConfirmPromptView
        message={args.message}
        initialValue={args.initialValue}
        resolve={resolve}
      />
    )
  }, session)
}

export async function runOpenTuiSelectPrompt<T>(args: {
  message: string
  options: OpenTuiSelectOption<T>[]
  initialValue?: T
  formatHistoryLine?: (value: T) => string | undefined
}, session?: OpenTuiRendererSession): Promise<T | OpenTuiCancel> {
  return runOpenTuiPrompt({
    formatHistoryLine: args.formatHistoryLine,
    render: (resolve) => (
      <SelectPromptView
        message={args.message}
        options={args.options}
        initialValue={args.initialValue}
        resolve={resolve}
      />
    )
  }, session)
}

export async function runOpenTuiMultiSelectPrompt<T>(args: {
  message: string
  options: OpenTuiSelectOption<T>[]
  initialValues?: T[]
  required?: boolean
  formatHistoryLine?: (value: T[]) => string | undefined
}, session?: OpenTuiRendererSession): Promise<T[] | OpenTuiCancel> {
  return runOpenTuiPrompt({
    formatHistoryLine: args.formatHistoryLine,
    render: (resolve) => (
      <MultiSelectPromptView
        message={args.message}
        options={args.options}
        initialValues={args.initialValues}
        required={args.required}
        resolve={resolve}
      />
    )
  }, session)
}

export function isOpenTuiCancel(value: unknown): value is OpenTuiCancel {
  return value === OPEN_TUI_CANCEL
}
