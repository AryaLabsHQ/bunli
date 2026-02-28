/** @jsxImportSource @opentui/react */
import { createCliRenderer, CliRenderEvents } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { KeyEvent } from '@opentui/core'
import type { ReactNode } from 'react'
import { formatFixedWidth } from '../../components/text-layout.js'
import { isCancelKeyboardEvent, isCtrlCKeyboardEvent, PromptCancelBoundary, emitInterruptSignal } from './open-tui-cancel.js'
import { debugInput, DEBUG_VERBOSE, formatDebugSequence, isCtrlCRawSequence, isEscapeRawSequence, shouldLogRawSequence } from './open-tui-debug.js'
import { formatHistoryLineForStdout, historyLineColor, OpenTuiPromptShell } from './open-tui-history.js'
import {
  ConfirmPromptView,
  MultiSelectPromptView,
  SelectPromptView,
  TextPromptView
} from '../views/open-tui-prompt-views.js'
import { OPEN_TUI_CANCEL, type OpenTuiCancel, type OpenTuiSelectOption, type PromptResolver } from './open-tui-types.js'

interface RunPromptArgs<T> {
  render: (resolve: PromptResolver<T>) => ReactNode
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

    if (statusRoot && statusLine) {
      const width = Math.max(1, (process.stdout.columns ?? 80) - 1)
      const linesToRender = historyRenderLines()
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
      if (lines.length === 0) historyEntries.splice(index, 1)
      else historyEntries[index] = { key, lines: [...lines] }
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
        if (activePromptCancel === onSigint) activePromptCancel = undefined
        process.off('SIGINT', onSigint)
        activeRenderer.keyInput.off('keypress', onGlobalKeypress)
        promptRender = undefined
        promptRoot = undefined
        root.unmount()
      }

      activeRenderer.once(CliRenderEvents.DESTROY, () => {
        if (settled) return
        settled = true
        cleanup()
        resolve(OPEN_TUI_CANCEL)
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
