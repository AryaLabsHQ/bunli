import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import { spawnSync } from 'node:child_process'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'
import { displayWidth, formatFixedWidth, padEndTo } from '../components/text-layout.js'
import {
  createOpenTuiRendererSession,
  isOpenTuiCancel,
  type OpenTuiRendererSession,
  runOpenTuiConfirmPrompt,
  runOpenTuiMultiSelectPrompt,
  runOpenTuiSelectPrompt,
  runOpenTuiTextPrompt
} from './runtime/open-tui-session.js'

export type PromptMode = 'inline' | 'interactive'

interface BasePromptOptions<TFallback> {
  mode?: PromptMode
  fallbackValue?: TFallback
}

export interface PromptOptions extends BasePromptOptions<string> {
  default?: string
  validate?: (input: string) => boolean | string
  schema?: StandardSchemaV1
  placeholder?: string
  multiline?: boolean
}

export interface ConfirmOptions extends BasePromptOptions<boolean> {
  default?: boolean
}

export interface SelectOption<T = string> {
  label: string
  value: T
  hint?: string
  disabled?: boolean
}

export interface SelectOptions<T = string> extends BasePromptOptions<T> {
  options: SelectOption<T>[]
  default?: T
  hint?: string
}

export interface MultiSelectOptions<T = string> extends BasePromptOptions<T[]> {
  options: SelectOption<T>[]
  min?: number
  max?: number
  initialValues?: T[]
}

export const CANCEL = Symbol.for('bunli:prompt_cancel')
export type Cancel = typeof CANCEL | symbol

interface KeypressEvent {
  name?: string
  sequence?: string
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
}

interface PromptStyle {
  useColor: boolean
  symbols: {
    pointer: string
    pointerAlt: string
    rail: string
    section: string
    frameHorizontal: string
    frameVertical: string
    frameTopRight: string
    frameBottomLeft: string
    frameBottomRight: string
    introStart: string
    outroEnd: string
    question: string
    success: string
    error: string
    info: string
    warning: string
    selected: string
    unselected: string
  }
}

type PromptSymbolMode = 'ascii' | 'unicode'

function shouldUseColor(): boolean {
  if (process.env.NO_COLOR) return false
  return Boolean(process.stdout.isTTY)
}

function resolvePromptSymbolMode(env: NodeJS.ProcessEnv = process.env): PromptSymbolMode {
  const override = (env.BUNLI_TUI_SYMBOLS ?? env.BUNLI_SYMBOLS ?? '').trim().toLowerCase()
  if (override === 'ascii' || override === 'plain') return 'ascii'
  if (override === 'unicode') return 'unicode'
  if (!process.stdout.isTTY) return 'ascii'
  return 'unicode'
}

function resolvePromptSymbols(mode: PromptSymbolMode): PromptStyle['symbols'] {
  if (mode === 'ascii') {
    return {
      pointer: '>',
      pointerAlt: '*',
      rail: '|',
      section: '*',
      frameHorizontal: '-',
      frameVertical: '|',
      frameTopRight: '+',
      frameBottomLeft: '+',
      frameBottomRight: '+',
      introStart: '+',
      outroEnd: '+',
      question: '?',
      success: 'OK',
      error: 'ERR',
      info: 'INFO',
      warning: 'WARN',
      selected: '[x]',
      unselected: '[ ]'
    }
  }

  return {
    pointer: '>',
    pointerAlt: '›',
    rail: '│',
    section: '◇',
    frameHorizontal: '─',
    frameVertical: '│',
    frameTopRight: '╮',
    frameBottomLeft: '╰',
    frameBottomRight: '╯',
    introStart: '┌',
    outroEnd: '└',
    question: '?',
    success: 'OK',
    error: 'ERR',
    info: 'INFO',
    warning: 'WARN',
    selected: '[x]',
    unselected: '[ ]'
  }
}

function colorize(style: PromptStyle, colorCode: number, text: string): string {
  if (!style.useColor) return text
  return `\x1b[${colorCode}m${text}\x1b[0m`
}

function dim(style: PromptStyle, text: string): string {
  return colorize(style, 90, text)
}

function green(style: PromptStyle, text: string): string {
  return colorize(style, 32, text)
}

function red(style: PromptStyle, text: string): string {
  return colorize(style, 31, text)
}

function yellow(style: PromptStyle, text: string): string {
  return colorize(style, 33, text)
}

function cyan(style: PromptStyle, text: string): string {
  return colorize(style, 36, text)
}

function bold(style: PromptStyle, text: string): string {
  if (!style.useColor) return text
  return `\x1b[1m${text}\x1b[0m`
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

const promptStyle: PromptStyle = {
  useColor: shouldUseColor(),
  symbols: resolvePromptSymbols(resolvePromptSymbolMode())
}

function isCIEnvironment(): boolean {
  return isCIEnvironmentFromEnv(process.env)
}

function isCIEnvironmentFromEnv(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    env.CI ||
      env.CONTINUOUS_INTEGRATION ||
      env.GITHUB_ACTIONS ||
      env.GITLAB_CI ||
      env.CIRCLECI ||
      env.TRAVIS
  )
}

interface PromptEnvironment {
  stdinIsTTY: boolean
  stdoutIsTTY: boolean
  env: NodeJS.ProcessEnv
}

function canPromptInEnvironment(mode: PromptMode | undefined, environment: PromptEnvironment): boolean {
  if (mode === 'interactive') {
    return Boolean(environment.stdinIsTTY && environment.stdoutIsTTY)
  }
  return Boolean(environment.stdinIsTTY && environment.stdoutIsTTY && !isCIEnvironmentFromEnv(environment.env))
}

function canPrompt(mode?: PromptMode): boolean {
  return canPromptInEnvironment(mode, {
    stdinIsTTY: Boolean(process.stdin.isTTY),
    stdoutIsTTY: Boolean(process.stdout.isTTY),
    env: process.env
  })
}

let bypassTerminalCheckForTests = false

function resolveFallback<T>(enabled: boolean, fallbackValue: T | undefined): T | undefined {
  if (enabled) return undefined
  return fallbackValue
}

function assertInteractiveOrFallback<T>(mode: PromptMode | undefined, fallbackValue: T | undefined): T | undefined {
  if (bypassTerminalCheckForTests) return undefined

  const fallback = resolveFallback(canPrompt(mode), fallbackValue)
  if (fallback !== undefined) return fallback
  if (!canPrompt(mode)) {
    throw new Error('Prompt requires an interactive terminal. Provide fallbackValue for non-interactive environments.')
  }
  return undefined
}

export function isCancel(value: unknown): value is Cancel {
  return value === CANCEL
}

export class PromptCancelledError extends Error {
  constructor(message = 'Cancelled') {
    super(message)
    this.name = 'PromptCancelledError'
  }
}

export function assertNotCancelled<T>(value: T | Cancel, message?: string): T {
  if (isCancel(value)) throw new PromptCancelledError(message)
  return value
}

export function promptOrExit<T>(value: T | Cancel, message?: string): T {
  if (isCancel(value)) {
    cancel(message ?? 'Cancelled')
    process.exit(0)
  }
  return value
}

function cancelAndThrow(message?: string): never {
  cancel(message ?? 'Cancelled')
  throw new PromptCancelledError(message ?? 'Cancelled')
}

function renderSchemaIssues(error: unknown) {
  if (!(error instanceof SchemaError)) return
  console.error(formatErrorLine('Invalid input:'))
  for (const issue of error.issues) {
    console.error(`  ${dim(promptStyle, '-')} ${issue.message}`)
  }
  console.error()
}

async function askLine(message: string, defaultValue?: string): Promise<string | Cancel> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const abortController = new AbortController()
  const onSigint = () => abortController.abort()

  const promptLabel = defaultValue !== undefined
    ? `${formatQuestionLabel(message)} ${dim(promptStyle, `(${defaultValue})`)} `
    : `${formatQuestionLabel(message)} `

  process.on('SIGINT', onSigint)
  try {
    const answer = await rl.question(promptLabel, { signal: abortController.signal })
    if (answer.length === 0 && defaultValue !== undefined) return defaultValue
    return answer
  } catch (error) {
    if (abortController.signal.aborted) return CANCEL
    throw error
  } finally {
    process.off('SIGINT', onSigint)
    rl.close()
  }
}

function isPrintableKey(event: KeypressEvent): boolean {
  if (!event.sequence) return false
  if (event.ctrl || event.meta) return false
  return resolveTextInput(event.sequence).length > 0
}

function isCancelKey(key: KeypressEvent): boolean {
  const name = key.name?.toLowerCase() ?? ''
  const sequence = key.sequence ?? ''
  if (name === 'escape' || name === 'esc') return true
  if (sequence === '\u001b' || sequence === '\u0003') return true
  if (key.ctrl && (name === 'c' || sequence.toLowerCase() === 'c')) return true
  return false
}

function isSubmitKey(key: KeypressEvent): boolean {
  return key.name === 'return' || key.name === 'enter' || key.name === 'linefeed'
}

function isPasswordRevealToggleKey(key: KeypressEvent): boolean {
  return Boolean(key.ctrl && key.name === 'r')
}

function isMultiSelectToggleKey(key: KeypressEvent): boolean {
  return key.name === 'space'
}

function stripBracketedPasteEnvelope(sequence: string): string {
  return sequence
    .replace(/\u001b\[200~/g, '')
    .replace(/\u001b\[201~/g, '')
}

function resolveTextInput(sequence: string): string {
  const normalized = stripBracketedPasteEnvelope(sequence)
    .replace(/\r\n/g, '')
    .replace(/[\r\n]/g, '')

  let output = ''
  for (const char of normalized) {
    const codePoint = char.codePointAt(0)
    if (typeof codePoint !== 'number') continue
    if (codePoint < 0x20 || codePoint === 0x7f) continue
    output += char
  }
  return output
}

function writeStatusLine(text: string) {
  process.stdout.write(`\r\x1b[2K${text}`)
}

function clearStatusLine() {
  process.stdout.write('\r\x1b[2K')
}

function formatQuestionLabel(message: string): string {
  const leadingLineBreaks = message.match(/^(?:\r?\n)+/)?.[0] ?? ''
  const labelMessage = message.slice(leadingLineBreaks.length)
  return `${leadingLineBreaks}${cyan(promptStyle, promptStyle.symbols.question)} ${bold(promptStyle, labelMessage)}`
}

function formatErrorLine(message: string): string {
  return `${red(promptStyle, promptStyle.symbols.error)} ${message}`
}

function formatSuccessLine(message: string): string {
  return `${green(promptStyle, promptStyle.symbols.success)} ${message}`
}

function formatInfoLine(message: string): string {
  return `${cyan(promptStyle, promptStyle.symbols.info)} ${message}`
}

function formatWarningLine(message: string): string {
  return `${yellow(promptStyle, promptStyle.symbols.warning)} ${message}`
}

function formatIntroLine(message: string): string {
  const lead = cyan(promptStyle, promptStyle.symbols.introStart)
  const body = bold(promptStyle, message)
  const rail = dim(promptStyle, promptStyle.symbols.frameVertical)
  return `${lead}  ${body}\n${rail}`
}

function formatOutroLine(message: string): string {
  const lead = green(promptStyle, promptStyle.symbols.outroEnd)
  const body = bold(promptStyle, message)
  return `${lead}  ${body}`
}

function formatNoteLines(message: string, title?: string): string[] {
  const normalizedLines = message
    .split('\n')
    .map((line) => line.trimEnd())

  while (normalizedLines[0]?.trim().length === 0) {
    normalizedLines.shift()
  }
  while (normalizedLines[normalizedLines.length - 1]?.trim().length === 0) {
    normalizedLines.pop()
  }

  const bodyLines = normalizedLines.length > 0 ? normalizedLines : ['']

  const parsedRows = bodyLines.map((line) => {
    if (line.trim().length === 0) return null
    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) return null
    return {
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim()
    }
  })

  const nonEmptyLineCount = bodyLines.filter((line) => line.trim().length > 0).length
  const keyValueLineCount = parsedRows.filter((row) => row !== null).length
  const shouldAlignAsKeyValueTable = nonEmptyLineCount >= 2 && keyValueLineCount === nonEmptyLineCount
  const keyColumnWidth = shouldAlignAsKeyValueTable
    ? Math.max(...parsedRows.map((row) => (row ? displayWidth(row.key) : 0)), 0)
    : 0

  const alignedBodyLines = shouldAlignAsKeyValueTable
    ? bodyLines.map((line, index) => {
      const row = parsedRows[index]
      if (!row) return line
      return `${padEndTo(row.key, keyColumnWidth)} : ${row.value}`
    })
    : bodyLines

  if (!title) {
    const vertical = dim(promptStyle, promptStyle.symbols.frameVertical)
    return alignedBodyLines.map((line) => `${vertical}  ${line}`)
  }

  const terminalWidth = process.stdout.columns || 80
  const maxBodyWidth = Math.max(
    displayWidth(title),
    ...alignedBodyLines.map((line) => displayWidth(line))
  )
  const maxInnerWidth = Math.max(20, terminalWidth - 8)
  const minInnerWidth = Math.min(28, maxInnerWidth)
  const innerWidth = Math.max(minInnerWidth, Math.min(maxInnerWidth, maxBodyWidth + 2))
  const fill = Math.max(1, innerWidth - displayWidth(title) - 1)

  const topLine =
    `${cyan(promptStyle, promptStyle.symbols.section)}  ${bold(promptStyle, title)} ` +
    `${dim(promptStyle, promptStyle.symbols.frameHorizontal.repeat(fill))}` +
    `${dim(promptStyle, promptStyle.symbols.frameTopRight)}`
  const vertical = dim(promptStyle, promptStyle.symbols.frameVertical)
  const horizontal = dim(promptStyle, promptStyle.symbols.frameHorizontal.repeat(innerWidth + 2))
  const padLine = `${vertical} ${' '.repeat(innerWidth)} ${vertical}`
  const footer = `${dim(promptStyle, promptStyle.symbols.frameBottomLeft)}${horizontal}${dim(promptStyle, promptStyle.symbols.frameBottomRight)}`

  return [
    topLine,
    padLine,
    ...alignedBodyLines.map((line) => `${vertical} ${formatFixedWidth(line, innerWidth, { overflow: 'clip' })} ${vertical}`),
    padLine,
    footer
  ]
}

function renderFrame(lines: string[], prevLineCount: number): number {
  if (prevLineCount > 0) {
    process.stdout.write(`\x1b[${prevLineCount}A`)
    process.stdout.write('\x1b[J')
  }
  process.stdout.write(`${lines.join('\n')}\n`)
  return lines.length
}

function renderSelectFrame<T>(args: {
  message: string
  options: SelectOption<T>[]
  selectedIndex: number
  hint?: string
  tick?: number
}): string[] {
  const lines: string[] = [
    formatQuestionLabel(args.message),
    dim(
      promptStyle,
      args.hint ?? `Use Up/Down, Enter to choose, 1-${Math.min(9, args.options.length)} for shortcuts`
    )
  ]

  for (let index = 0; index < args.options.length; index += 1) {
    const option = args.options[index]
    if (!option) continue
    const active = index === args.selectedIndex
    const pointerSymbol = active
      ? (args.tick ?? 0) % 2 === 0
        ? promptStyle.symbols.pointer
        : promptStyle.symbols.pointerAlt
      : ' '
    const rail = active
      ? cyan(promptStyle, promptStyle.symbols.rail)
      : dim(promptStyle, promptStyle.symbols.rail)
    const pointer = active ? cyan(promptStyle, pointerSymbol) : pointerSymbol
    const numeric = dim(promptStyle, `${index + 1}.`)
    const label = option.disabled ? dim(promptStyle, option.label) : option.label
    const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
    const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
    lines.push(`${rail} ${pointer} ${numeric} ${label}${hint}${disabled}`)
  }

  return lines
}

function renderMultiSelectFrame<T>(args: {
  message: string
  options: SelectOption<T>[]
  selectedIndex: number
  selected: Set<T>
  errorMessage?: string
  tick?: number
}): string[] {
  const lines: string[] = [
    formatQuestionLabel(args.message),
    dim(
      promptStyle,
      `Use Up/Down, Space to toggle, Enter to submit, 1-${Math.min(9, args.options.length)} shortcuts`
    )
  ]

  if (args.errorMessage) {
    lines.push(formatErrorLine(args.errorMessage))
  }

  for (let index = 0; index < args.options.length; index += 1) {
    const option = args.options[index]
    if (!option) continue
    const active = index === args.selectedIndex
    const pointerSymbol = active
      ? (args.tick ?? 0) % 2 === 0
        ? promptStyle.symbols.pointer
        : promptStyle.symbols.pointerAlt
      : ' '
    const rail = active
      ? cyan(promptStyle, promptStyle.symbols.rail)
      : dim(promptStyle, promptStyle.symbols.rail)
    const pointer = active ? cyan(promptStyle, pointerSymbol) : pointerSymbol
    const checkmark = args.selected.has(option.value)
      ? green(promptStyle, promptStyle.symbols.selected)
      : dim(promptStyle, promptStyle.symbols.unselected)
    const numeric = dim(promptStyle, `${index + 1}.`)
    const label = option.disabled ? dim(promptStyle, option.label) : option.label
    const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
    const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
    lines.push(`${rail} ${pointer} ${numeric} ${checkmark} ${label}${hint}${disabled}`)
  }

  const selectedSummary = buildSelectedSummary(args.selected, args.options)
  lines.push(dim(promptStyle, `Selected: ${selectedSummary}`))
  return lines
}

function simulateSelectKeySequence<T>(args: {
  options: SelectOption<T>[]
  keys: KeypressEvent[]
  initialValue?: T
}): { result: T | Cancel | null; selectedIndex: number } {
  const enabledCount = args.options.filter((option) => !option.disabled).length
  if (enabledCount === 0) {
    return { result: CANCEL, selectedIndex: 0 }
  }

  let selectedIndex = initialSelectableIndex(args.options, args.initialValue)

  for (const key of args.keys) {
    if (isCancelKey(key)) {
      return { result: CANCEL, selectedIndex }
    }

    const shortcutOption = resolveShortcutOption(key, args.options)
    if (shortcutOption && !shortcutOption.disabled) {
      return { result: shortcutOption.value, selectedIndex }
    }

    if (key.name === 'up' || key.name === 'k') {
      selectedIndex = moveSelectableIndex(args.options, selectedIndex, -1)
      continue
    }

    if (key.name === 'down' || key.name === 'j') {
      selectedIndex = moveSelectableIndex(args.options, selectedIndex, 1)
      continue
    }

    if (isSubmitKey(key)) {
      const current = args.options[selectedIndex]
      if (current && !current.disabled) {
        return { result: current.value, selectedIndex }
      }
    }
  }

  return { result: null, selectedIndex }
}

function simulateMultiSelectKeySequence<T>(args: {
  options: SelectOption<T>[]
  keys: KeypressEvent[]
  initialValues?: T[]
  required?: boolean
}): {
  result: T[] | Cancel | null
  selectedIndex: number
  selected: Set<T>
  errorMessage?: string
} {
  const enabledCount = args.options.filter((option) => !option.disabled).length
  if (enabledCount === 0) {
    return { result: CANCEL, selectedIndex: 0, selected: new Set<T>() }
  }

  let selectedIndex = initialSelectableIndex(args.options)
  const selected = new Set<T>(
    args.options
      .filter((option) => !option.disabled && args.initialValues?.includes(option.value))
      .map((option) => option.value)
  )
  let errorMessage: string | undefined

  for (const key of args.keys) {
    if (isCancelKey(key)) {
      return { result: CANCEL, selectedIndex, selected, errorMessage }
    }

    const shortcutOption = resolveShortcutOption(key, args.options)
    if (shortcutOption && !shortcutOption.disabled) {
      toggleSelection(selected, shortcutOption)
      errorMessage = undefined
      continue
    }

    if (key.name === 'up' || key.name === 'k') {
      selectedIndex = moveSelectableIndex(args.options, selectedIndex, -1)
      errorMessage = undefined
      continue
    }

    if (key.name === 'down' || key.name === 'j') {
      selectedIndex = moveSelectableIndex(args.options, selectedIndex, 1)
      errorMessage = undefined
      continue
    }

    if (isMultiSelectToggleKey(key)) {
      const current = args.options[selectedIndex]
      if (current && !current.disabled) {
        toggleSelection(selected, current)
        errorMessage = undefined
      }
      continue
    }

    if (isSubmitKey(key)) {
      const values = args.options
        .filter((option) => selected.has(option.value))
        .map((option) => option.value)

      if (args.required && values.length === 0) {
        errorMessage = 'Select at least one option.'
        continue
      }

      return { result: values, selectedIndex, selected, errorMessage }
    }
  }

  return { result: null, selectedIndex, selected, errorMessage }
}

function simulatePasswordKeySequence(args: {
  keys: KeypressEvent[]
  validate?: (value: string) => string | undefined
}): { result: string | Cancel | null; revealed: boolean; value: string } {
  const chars: string[] = []
  let revealed = false

  for (const key of args.keys) {
    if (isCancelKey(key)) {
      return { result: CANCEL, revealed, value: chars.join('') }
    }

    if (isPasswordRevealToggleKey(key)) {
      revealed = !revealed
      continue
    }

    if (key.name === 'backspace' || key.name === 'delete') {
      chars.pop()
      continue
    }

    if (isSubmitKey(key)) {
      const value = chars.join('')
      const validationError = args.validate?.(value)
      if (validationError) {
        chars.length = 0
        continue
      }
      return { result: value, revealed, value }
    }

    if (isPrintableKey(key)) {
      chars.push(resolveTextInput(key.sequence as string))
    }
  }

  return { result: null, revealed, value: chars.join('') }
}

function initialSelectableIndex<T>(options: SelectOption<T>[], preferred?: T): number {
  if (preferred !== undefined) {
    const preferredIndex = options.findIndex((option) => option.value === preferred && !option.disabled)
    if (preferredIndex >= 0) return preferredIndex
  }

  const firstEnabled = options.findIndex((option) => !option.disabled)
  return firstEnabled >= 0 ? firstEnabled : 0
}

function moveSelectableIndex<T>(
  options: SelectOption<T>[],
  currentIndex: number,
  delta: number
): number {
  if (options.length === 0) return 0

  for (let steps = 0; steps < options.length; steps += 1) {
    const next = (currentIndex + delta * (steps + 1) + options.length) % options.length
    if (!options[next]?.disabled) return next
  }

  return currentIndex
}

function shortcutIndexFromKey(key: KeypressEvent): number | null {
  if (!key.sequence) return null
  if (!/^[1-9]$/.test(key.sequence)) return null
  return Number.parseInt(key.sequence, 10) - 1
}

function resolveShortcutOption<T>(
  key: KeypressEvent,
  options: SelectOption<T>[]
): SelectOption<T> | undefined {
  const index = shortcutIndexFromKey(key)
  if (index === null) return undefined
  return options[index]
}

function buildSelectedSummary<T>(selected: Set<T>, options: SelectOption<T>[]): string {
  const labels = options
    .filter((option) => selected.has(option.value))
    .map((option) => option.label)

  return labels.length > 0 ? labels.join(', ') : 'none'
}

function toggleSelection<T>(selected: Set<T>, option: SelectOption<T>) {
  if (selected.has(option.value)) {
    selected.delete(option.value)
  } else {
    selected.add(option.value)
  }
}

async function withRawKeyboard<T>(run: (readKey: () => Promise<KeypressEvent>) => Promise<T>): Promise<T> {
  const stdin = process.stdin
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Raw keyboard input requires a TTY terminal.')
  }

  emitKeypressEvents(stdin)
  const wasRaw = Boolean((stdin as unknown as { isRaw?: boolean }).isRaw)
  stdin.setRawMode(true)
  stdin.resume()

  const queue: KeypressEvent[] = []
  let pendingResolver: ((key: KeypressEvent) => void) | null = null

  const onKeypress = (sequence: string, key: KeypressEvent) => {
    const resolvedKey: KeypressEvent = {
      ...key,
      sequence: key?.sequence ?? sequence
    }

    if (pendingResolver) {
      const resolve = pendingResolver
      pendingResolver = null
      resolve(resolvedKey)
      return
    }

    queue.push(resolvedKey)
  }

  stdin.on('keypress', onKeypress)

  const readKey = () =>
    new Promise<KeypressEvent>((resolve) => {
      const next = queue.shift()
      if (next) {
        resolve(next)
        return
      }
      pendingResolver = resolve
    })

  try {
    return await run(readKey)
  } finally {
    stdin.off('keypress', onKeypress)
    pendingResolver = null
    queue.length = 0
    stdin.setRawMode(wasRaw)
    if (!wasRaw) {
      stdin.pause()
    }
  }
}

async function askPasswordWithReveal(args: {
  message: string
  validate?: (value: string) => string | undefined
}): Promise<string | Cancel> {
  process.stdout.write(`${formatQuestionLabel(args.message)}\n`)
  process.stdout.write(`${dim(promptStyle, 'Press Ctrl+R to toggle reveal, Enter to submit, Esc to cancel')}\n`)

  const chars: string[] = []
  let revealed = false

  const render = () => {
    const display = revealed ? chars.join('') : '*'.repeat(chars.length)
    const mode = revealed ? dim(promptStyle, '(revealed)') : dim(promptStyle, '(hidden)')
    writeStatusLine(`${cyan(promptStyle, promptStyle.symbols.pointer)} Password ${mode}: ${display}`)
  }

  return withRawKeyboard(async (readKey) => {
    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        clearStatusLine()
        process.stdout.write(`\n${formatWarningLine('Password entry cancelled')}\n`)
        return CANCEL
      }

      if (isPasswordRevealToggleKey(key)) {
        revealed = !revealed
        render()
        continue
      }

      if (key.name === 'backspace' || key.name === 'delete') {
        chars.pop()
        render()
        continue
      }

      if (isSubmitKey(key)) {
        const value = chars.join('')
        const validationError = args.validate?.(value)
        if (validationError) {
          clearStatusLine()
          process.stdout.write(`\n${formatErrorLine(validationError)}\n`)
          chars.length = 0
          render()
          continue
        }
        clearStatusLine()
        process.stdout.write('\n')
        return value
      }

      if (isPrintableKey(key)) {
        chars.push(resolveTextInput(key.sequence as string))
        render()
      }
    }
  })
}

function setTerminalEchoEnabled(enabled: boolean): boolean {
  if (!process.stdin.isTTY) return false
  if (process.platform === 'win32') return false

  const flag = enabled ? 'echo' : '-echo'
  const attempts: Array<() => ReturnType<typeof spawnSync>> = [
    () => spawnSync('stty', [flag], { stdio: ['inherit', 'ignore', 'ignore'] }),
    () =>
      spawnSync('stty', process.platform === 'darwin' ? ['-f', '/dev/tty', flag] : ['-F', '/dev/tty', flag], {
        stdio: ['ignore', 'ignore', 'ignore']
      }),
    () => spawnSync('sh', ['-lc', `stty ${flag} < /dev/tty`], { stdio: ['ignore', 'ignore', 'ignore'] })
  ]

  for (const attempt of attempts) {
    const result = attempt()
    if (result.status === 0) return true
  }

  return false
}

async function askPasswordNoEcho(args: {
  message: string
  validate?: (value: string) => string | undefined
}): Promise<string | Cancel> {
  const stdin = process.stdin
  const stdout = process.stdout
  if (!stdin.isTTY || !stdout.isTTY) {
    return askLine(args.message)
  }

  while (true) {
    stdout.write(`${formatQuestionLabel(args.message)} `)
    let value = ''
    const disabledEcho = setTerminalEchoEnabled(false)
    if (!disabledEcho) {
      return askPasswordWithReveal(args)
    }

    try {
      const rl = createInterface({ input: stdin, output: stdout, terminal: false })
      const abortController = new AbortController()
      const onSigint = () => abortController.abort()
      process.on('SIGINT', onSigint)
      try {
        value = await rl.question('', { signal: abortController.signal })
      } catch (error) {
        if (abortController.signal.aborted) return CANCEL
        throw error
      } finally {
        process.off('SIGINT', onSigint)
        rl.close()
      }
    } finally {
      if (disabledEcho) {
        setTerminalEchoEnabled(true)
      }
      stdout.write('\n')
    }

    const validationError = args.validate?.(value)
    if (validationError) {
      console.error(formatErrorLine(validationError))
      continue
    }

    return value
  }
}

async function askSelectWithKeyboard<T>(args: {
  message: string
  options: SelectOption<T>[]
  initialValue?: T
}): Promise<T | Cancel> {
  const enabledCount = args.options.filter((option) => !option.disabled).length
  if (enabledCount === 0) {
    console.error(formatErrorLine('No selectable options available.'))
    return CANCEL
  }

  let selectedIndex = initialSelectableIndex(args.options, args.initialValue)
  let renderedLines = 0
  let tick = 0

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const lines = renderSelectFrame({
        message: args.message,
        options: args.options,
        selectedIndex,
        tick
      })
      tick += 1
      renderedLines = renderFrame(lines, renderedLines)
    }

    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        process.stdout.write('\n')
        process.stdout.write(`${formatWarningLine('Selection cancelled')}\n`)
        return CANCEL
      }

      const shortcutOption = resolveShortcutOption(key, args.options)
      if (shortcutOption && !shortcutOption.disabled) {
        process.stdout.write('\n')
        return shortcutOption.value
      }

      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = moveSelectableIndex(args.options, selectedIndex, -1)
        render()
        continue
      }

      if (key.name === 'down' || key.name === 'j') {
        selectedIndex = moveSelectableIndex(args.options, selectedIndex, 1)
        render()
        continue
      }

      if (isSubmitKey(key)) {
        const current = args.options[selectedIndex]
        if (!current || current.disabled) {
          render()
          continue
        }
        process.stdout.write('\n')
        return current.value
      }
    }
  })
}

async function askMultiSelectWithKeyboard<T>(args: {
  message: string
  options: SelectOption<T>[]
  initialValues?: T[]
  required?: boolean
}): Promise<T[] | Cancel> {
  const enabledCount = args.options.filter((option) => !option.disabled).length
  if (enabledCount === 0) {
    console.error(formatErrorLine('No selectable options available.'))
    return CANCEL
  }

  let selectedIndex = initialSelectableIndex(args.options)
  const selected = new Set<T>(
    args.options
      .filter((option) => !option.disabled && args.initialValues?.includes(option.value))
      .map((option) => option.value)
  )

  let renderedLines = 0
  let errorMessage: string | undefined
  let tick = 0

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const lines = renderMultiSelectFrame({
        message: args.message,
        options: args.options,
        selectedIndex,
        selected,
        errorMessage,
        tick
      })
      tick += 1
      renderedLines = renderFrame(lines, renderedLines)
    }

    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        process.stdout.write('\n')
        process.stdout.write(`${formatWarningLine('Selection cancelled')}\n`)
        return CANCEL
      }

      const shortcutOption = resolveShortcutOption(key, args.options)
      if (shortcutOption && !shortcutOption.disabled) {
        toggleSelection(selected, shortcutOption)
        errorMessage = undefined
        render()
        continue
      }

      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = moveSelectableIndex(args.options, selectedIndex, -1)
        errorMessage = undefined
        render()
        continue
      }

      if (key.name === 'down' || key.name === 'j') {
        selectedIndex = moveSelectableIndex(args.options, selectedIndex, 1)
        errorMessage = undefined
        render()
        continue
      }

      if (isMultiSelectToggleKey(key)) {
        const current = args.options[selectedIndex]
        if (current && !current.disabled) {
          toggleSelection(selected, current)
          errorMessage = undefined
        }
        render()
        continue
      }

      if (isSubmitKey(key)) {
        const values = args.options
          .filter((option) => selected.has(option.value))
          .map((option) => option.value)

        if (args.required && values.length === 0) {
          errorMessage = 'Select at least one option.'
          render()
          continue
        }

        process.stdout.write('\n')
        return values
      }
    }
  })
}

interface RawSpinner {
  start(text?: string): void
  stop(text?: string, options?: { silent?: boolean }): void
  message(text: string): void
}

type RawSpinnerAnimation = 'line' | 'dots' | 'braille'

interface RawSpinnerOptions {
  animation?: RawSpinnerAnimation
  showTimer?: boolean
  intervalMs?: number
}

interface PromptDriver {
  text(args: {
    message: string
    placeholder?: string
    defaultValue?: string
    validate?: (value: string) => string | undefined
  }): Promise<string | Cancel>
  password(args: {
    message: string
    validate?: (value: string) => string | undefined
  }): Promise<string | Cancel>
  confirm(args: { message: string; initialValue?: boolean }): Promise<boolean | Cancel>
  select<T>(args: { message: string; options: SelectOption<T>[]; initialValue?: T }): Promise<T | Cancel>
  multiselect<T>(args: {
    message: string
    options: SelectOption<T>[]
    initialValues?: T[]
    required?: boolean
  }): Promise<T[] | Cancel>
  intro(message: string): void
  outro(message: string): void
  note(message: string, title?: string): void
  cancel(message?: string): void
  log: {
    info(message: string): void
    success(message: string): void
    warn(message: string): void
    error(message: string): void
  }
  spinner(options?: RawSpinnerOptions): RawSpinner
}

function findOptionByToken<T>(token: string, options: SelectOption<T>[]): SelectOption<T> | undefined {
  const asNumber = Number.parseInt(token, 10)
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1]
  }
  return options.find((option) => String(option.value) === token)
}

let globalOpenTuiSession: OpenTuiRendererSession | undefined
let globalOpenTuiSessionCleanupRegistered = false

async function disposeGlobalOpenTuiSession(): Promise<void> {
  const session = globalOpenTuiSession
  globalOpenTuiSession = undefined
  if (!session) return
  await session.dispose()
}

function registerGlobalOpenTuiSessionCleanup(): void {
  if (globalOpenTuiSessionCleanupRegistered) return
  globalOpenTuiSessionCleanupRegistered = true
  process.once('beforeExit', () => {
    void disposeGlobalOpenTuiSession().catch(() => {})
  })
}

function getGlobalOpenTuiSession(): OpenTuiRendererSession {
  registerGlobalOpenTuiSessionCleanup()
  globalOpenTuiSession ??= createOpenTuiRendererSession()
  return globalOpenTuiSession
}

function createOpenTuiRawSpinner(session: OpenTuiRendererSession, options?: RawSpinnerOptions): RawSpinner {
  const framesByAnimation: Record<RawSpinnerAnimation, string[]> = {
    line: ['-', '\\', '|', '/'],
    dots: ['.  ', '.. ', '...', ' ..', '  .'],
    braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
  }

  const animation = options?.animation ?? 'braille'
  const frames = framesByAnimation[animation] ?? framesByAnimation.dots
  const intervalMs = options?.intervalMs ?? 80
  let frameIndex = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false
  let currentText = ''
  let startedAt = 0

  const stopTimer = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  const renderFrame = () => {
    if (!running) return
    const frame = frames[frameIndex % frames.length] ?? '-'
    frameIndex += 1
    const elapsedSuffix = options?.showTimer
      ? ` ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
      : ''
    session.renderStatusLine(`${frame} ${currentText}${elapsedSuffix}`, '#6ac4ff')
  }

  return {
    start(text) {
      currentText = text ?? currentText
      running = true
      startedAt = Date.now()

      if (!process.stdout.isTTY) {
        if (currentText) console.log(formatInfoLine(currentText))
        return
      }

      stopTimer()
      renderFrame()
      timer = setInterval(renderFrame, intervalMs)
    },
    stop(text, stopOptions) {
      if (text) currentText = text
      const elapsedSuffix = options?.showTimer
        ? ` (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`
        : ''

      if (!process.stdout.isTTY) {
        if (currentText && !stopOptions?.silent) console.log(`${currentText}${elapsedSuffix}`)
        running = false
        return
      }

      stopTimer()
      running = false
      session.clearStatusLine()
      session.flushHistoryToStdout()
      if (stopOptions?.silent) return
      if (currentText) process.stdout.write(`${currentText}${elapsedSuffix}\n`)
    },
    message(text) {
      currentText = text
      if (!process.stdout.isTTY) {
        console.log(formatInfoLine(text))
        return
      }

      if (!running) {
        session.renderStatusLine(`- ${currentText}`, '#6ac4ff')
        return
      }

      renderFrame()
    }
  }
}

const defaultDriver: PromptDriver = {
  async text(args) {
    const value = await runOpenTuiTextPrompt({
      message: args.message,
      placeholder: args.placeholder,
      defaultValue: args.defaultValue,
      validate: args.validate,
      formatHistoryLine: (submitted) => `? ${args.message} ${submitted}`
    }, getGlobalOpenTuiSession())
    return isOpenTuiCancel(value) ? CANCEL : value
  },

  async password(args) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      return askPasswordNoEcho(args)
    }

    while (true) {
      const value = await askLine(args.message)
      if (isCancel(value)) return CANCEL
      const validationError = args.validate?.(value)
      if (validationError) {
        console.error(formatErrorLine(validationError))
        continue
      }
      return value
    }
  },

  async confirm(args) {
    const defaultYes = args.initialValue ?? false
    const value = await runOpenTuiConfirmPrompt({
      message: args.message,
      initialValue: defaultYes,
      formatHistoryLine: (submitted) => `? ${args.message} ${submitted ? 'Yes' : 'No'}`
    }, getGlobalOpenTuiSession())
    return isOpenTuiCancel(value) ? CANCEL : value
  },

  async select<T>(args: { message: string; options: SelectOption<T>[]; initialValue?: T }): Promise<T | Cancel> {
    const value = await runOpenTuiSelectPrompt<T>({
      message: args.message,
      options: args.options,
      initialValue: args.initialValue,
      formatHistoryLine: (submitted) => {
        const selected = args.options.find((entry) => entry.value === submitted)
        return `? ${args.message} ${selected?.label ?? String(submitted)}`
      }
    }, getGlobalOpenTuiSession())
    return isOpenTuiCancel(value) ? CANCEL : value
  },

  async multiselect<T>(args: {
    message: string
    options: SelectOption<T>[]
    initialValues?: T[]
    required?: boolean
  }): Promise<T[] | Cancel> {
    const value = await runOpenTuiMultiSelectPrompt<T>({
      message: args.message,
      options: args.options,
      initialValues: args.initialValues,
      required: args.required,
      formatHistoryLine: (submitted) => {
        const labels = args.options
          .filter((entry) => submitted.includes(entry.value))
          .map((entry) => entry.label)
        return `? ${args.message} ${labels.length > 0 ? labels.join(', ') : '(none)'}`
      }
    }, getGlobalOpenTuiSession())
    return isOpenTuiCancel(value) ? CANCEL : value
  },

  intro(message) {
    console.log(`\n${formatIntroLine(message)}`)
  },

  outro(message) {
    console.log(`\n${formatOutroLine(message)}\n`)
  },

  note(message, title) {
    console.log(formatNoteLines(message, title).join('\n'))
  },

  cancel(message = 'Cancelled') {
    console.log(formatWarningLine(message))
  },

  log: {
    info(message) {
      console.log(formatInfoLine(message))
    },
    success(message) {
      console.log(formatSuccessLine(message))
    },
    warn(message) {
      console.warn(formatWarningLine(message))
    },
    error(message) {
      console.error(formatErrorLine(message))
    }
  },

  spinner(options) {
    return createOpenTuiRawSpinner(getGlobalOpenTuiSession(), options)
  }
}

const runtime: PromptDriver = {
  ...defaultDriver
}

export function __setPromptRuntimeForTests(overrides: Partial<PromptDriver>): () => void {
  const original = { ...runtime }
  const originalBypass = bypassTerminalCheckForTests

  bypassTerminalCheckForTests = true
  Object.assign(runtime, overrides)
  return () => {
    bypassTerminalCheckForTests = originalBypass
    Object.assign(runtime, original)
  }
}

export const __promptInternalsForTests = {
  shortcutIndexFromKey,
  moveSelectableIndex,
  initialSelectableIndex,
  resolveShortcutOption,
  buildSelectedSummary,
  toggleSelection,
  isCancelKey,
  isSubmitKey,
  isPasswordRevealToggleKey,
  isMultiSelectToggleKey,
  formatQuestionLabel,
  renderFrame,
  renderSelectFrame,
  renderMultiSelectFrame,
  simulateSelectKeySequence,
  simulateMultiSelectKeySequence,
  simulatePasswordKeySequence,
  formatIntroLine,
  formatOutroLine,
  formatNoteLines,
  formatErrorLine,
  canPrompt,
  canPromptInEnvironment,
  isCIEnvironmentFromEnv,
  resolvePromptSymbolMode,
  resolveTextInput,
  ensureGlobalOpenTuiSession: () => getGlobalOpenTuiSession(),
  peekGlobalOpenTuiSession: () => globalOpenTuiSession,
  disposeGlobalOpenTuiSession
}

async function validateWithSchema<TOut = unknown>(value: string, options: PromptOptions): Promise<TOut> {
  const result = await options.schema!['~standard'].validate(value)
  if ('issues' in result && result.issues) {
    throw new SchemaError(result.issues)
  }
  if ('value' in result) {
    return result.value as TOut
  }
  throw new Error('Schema validation did not return a value')
}

export async function text<T = string>(message: string, options: PromptOptions = {}): Promise<T> {
  const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
  if (fallback !== undefined) return fallback as T

  while (true) {
    const value = await runtime.text({
      message,
      placeholder: options.placeholder,
      defaultValue: options.default,
      validate: options.validate
        ? (v) => {
            const input = (v ?? '').trim()
            const res = options.validate?.(input)
            if (res === true) return undefined
            if (typeof res === 'string') return res
            return 'Invalid input'
          }
        : undefined
    })

    if (isCancel(value)) cancelAndThrow()

    const input = (value ?? '').trim()

    if (options.schema) {
      try {
        return await validateWithSchema<T>(input, options)
      } catch (err) {
        renderSchemaIssues(err)
        continue
      }
    }

    return input as T
  }
}

export async function password<T = string>(message: string, options: PromptOptions = {}): Promise<T> {
  const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
  if (fallback !== undefined) return fallback as T

  while (true) {
    const value = await runtime.password({
      message,
      validate: options.validate
        ? (v) => {
            const input = v ?? ''
            const res = options.validate?.(input)
            if (res === true) return undefined
            if (typeof res === 'string') return res
            return 'Invalid input'
          }
        : undefined
    })

    if (isCancel(value)) cancelAndThrow()

    const input = value ?? ''

    if (options.schema) {
      try {
        return await validateWithSchema<T>(input, options)
      } catch (err) {
        renderSchemaIssues(err)
        continue
      }
    }

    return input as T
  }
}

export async function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
  if (fallback !== undefined) return fallback

  const value = await runtime.confirm({
    message,
    initialValue: options.default
  })

  if (isCancel(value)) cancelAndThrow()
  return value
}

export async function select<T = string>(message: string, options: SelectOptions<T>): Promise<T> {
  const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
  if (fallback !== undefined) return fallback

  const value = await runtime.select<T>({
    message,
    options: options.options,
    initialValue: options.default
  })

  if (isCancel(value)) cancelAndThrow()
  return value
}

export async function multiselect<T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]> {
  const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
  if (fallback !== undefined) return fallback

  while (true) {
    const value = await runtime.multiselect<T>({
      message,
      options: options.options,
      initialValues: options.initialValues,
      required: (options.min ?? 0) > 0
    })

    if (isCancel(value)) cancelAndThrow()

    const picked = value ?? []
    const min = options.min ?? 0
    const max = options.max

    if (min > 0 && picked.length < min) {
      console.error(formatErrorLine(`Please select at least ${min} option(s).`))
      continue
    }

    if (typeof max === 'number' && picked.length > max) {
      console.error(formatErrorLine(`Please select at most ${max} option(s).`))
      continue
    }

    return picked
  }
}

export async function group<T extends Record<string, () => Promise<unknown>>>(
  steps: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const result: Partial<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> = {}
  for (const [name, step] of Object.entries(steps)) {
    result[name as keyof T] = (await step()) as Awaited<ReturnType<T[keyof T]>>
  }
  return result as { [K in keyof T]: Awaited<ReturnType<T[K]>> }
}

export const intro = (...args: Parameters<typeof runtime.intro>) => runtime.intro(...args)
export const outro = (...args: Parameters<typeof runtime.outro>) => runtime.outro(...args)
export const note = (...args: Parameters<typeof runtime.note>) => runtime.note(...args)
export const log: PromptDriver['log'] = {
  info(message) {
    runtime.log.info(message)
  },
  success(message) {
    runtime.log.success(message)
  },
  warn(message) {
    runtime.log.warn(message)
  },
  error(message) {
    runtime.log.error(message)
  }
}
export const cancel = (...args: Parameters<typeof runtime.cancel>) => runtime.cancel(...args)
export const rawSpinner = (...args: Parameters<typeof runtime.spinner>) => runtime.spinner(...args)

export type SpinnerAnimation = RawSpinnerAnimation

export interface SpinnerOptions {
  text?: string
  animation?: SpinnerAnimation
  showTimer?: boolean
  intervalMs?: number
}

export interface Spinner {
  start(text?: string): void
  stop(text?: string): void
  succeed(text?: string): void
  fail(text?: string): void
  warn(text?: string): void
  info(text?: string): void
  update(text: string): void
}

export function spinner(options?: SpinnerOptions | string): Spinner {
  const config: SpinnerOptions =
    typeof options === 'string'
      ? { text: options }
      : options ?? {}

  const raw = runtime.spinner({
    animation: config.animation,
    showTimer: config.showTimer,
    intervalMs: config.intervalMs
  })

  let currentText = config.text ?? ''
  let startedAt = 0

  const elapsedSuffix = () =>
    config.showTimer && startedAt > 0
      ? ` (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`
      : ''

  const settle = (tone: 'success' | 'error' | 'warning' | 'info', text?: string) => {
    if (text !== undefined) currentText = text

    raw.stop(undefined, { silent: true })
    const value = `${currentText}${elapsedSuffix()}`
    if (!value.trim()) return

    const line =
      tone === 'success'
        ? formatSuccessLine(value)
        : tone === 'error'
          ? formatErrorLine(value)
          : tone === 'warning'
            ? formatWarningLine(value)
            : formatInfoLine(value)
    console.log(line)
  }

  const api: Spinner = {
    start(text) {
      if (text !== undefined) currentText = text
      startedAt = Date.now()
      raw.start(currentText)
    },
    stop(text) {
      if (text !== undefined) currentText = text
      raw.stop(currentText)
    },
    succeed(text) {
      settle('success', text)
    },
    fail(text) {
      settle('error', text)
    },
    warn(text) {
      settle('warning', text)
    },
    info(text) {
      settle('info', text)
    },
    update(text) {
      currentText = text
      raw.message(text)
    }
  }

  if (config.text) api.start(config.text)
  return api
}

export interface PromptSession {
  initialize: () => Promise<void>
  prompt: PromptApi
  spinner: typeof spinner
  dispose: () => Promise<void>
}

function createQueueRunner() {
  let chain = Promise.resolve()

  return async function runQueued<T>(job: () => Promise<T>): Promise<T> {
    const run = chain.then(job, job)
    chain = run.then(() => undefined, () => undefined)
    return run
  }
}

export function createPromptSession(): PromptSession {
  const runQueued = createQueueRunner()
  const rendererSession: OpenTuiRendererSession = createOpenTuiRendererSession()
  const flushHistory = () => rendererSession.flushHistoryToStdout()
  const appendHistory = (lines: string[]) => rendererSession.appendHistoryLines(lines)

  const sessionText = async <T = string>(message: string, options: PromptOptions = {}): Promise<T> => {
    return runQueued(async () => {
      const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
      if (fallback !== undefined) return fallback as T

      while (true) {
        const value = await runOpenTuiTextPrompt({
          message,
          placeholder: options.placeholder,
          defaultValue: options.default,
          validate: options.validate
            ? (v) => {
                const input = (v ?? '').trim()
                const res = options.validate?.(input)
                if (res === true) return undefined
                if (typeof res === 'string') return res
                return 'Invalid input'
              }
            : undefined,
          formatHistoryLine: (submitted) => `? ${message} ${submitted}`
        }, rendererSession)

        if (isOpenTuiCancel(value) || isCancel(value)) cancelAndThrow()

        const input = (value ?? '').trim()

        if (options.schema) {
          try {
            return await validateWithSchema<T>(input, options)
          } catch (err) {
            renderSchemaIssues(err)
            continue
          }
        }

        return input as T
      }
    })
  }

  const sessionPassword = async <T = string>(message: string, options: PromptOptions = {}): Promise<T> => {
    return runQueued(async () => {
      flushHistory()
      return password<T>(message, options)
    })
  }

  const sessionConfirm = async (message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return runQueued(async () => {
      const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
      if (fallback !== undefined) return fallback

      const defaultYes = options.default ?? false
      const value = await runOpenTuiConfirmPrompt({
        message,
        initialValue: defaultYes,
        formatHistoryLine: (submitted) => `? ${message} ${submitted ? 'Yes' : 'No'}`
      }, rendererSession)

      if (isOpenTuiCancel(value) || isCancel(value)) cancelAndThrow()
      return value
    })
  }

  const sessionSelect = async <T = string>(message: string, options: SelectOptions<T>): Promise<T> => {
    return runQueued(async () => {
      const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
      if (fallback !== undefined) return fallback

      const value = await runOpenTuiSelectPrompt<T>({
        message,
        options: options.options,
        initialValue: options.default,
        formatHistoryLine: (submitted) => {
          const selected = options.options.find((entry) => entry.value === submitted)
          return `? ${message} ${selected?.label ?? String(submitted)}`
        }
      }, rendererSession)

      if (isOpenTuiCancel(value) || isCancel(value)) cancelAndThrow()
      return value
    })
  }

  const sessionMultiSelect = async <T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]> => {
    return runQueued(async () => {
      const fallback = assertInteractiveOrFallback(options.mode, options.fallbackValue)
      if (fallback !== undefined) return fallback

      while (true) {
        const value = await runOpenTuiMultiSelectPrompt<T>({
          message,
          options: options.options,
          initialValues: options.initialValues,
          required: (options.min ?? 0) > 0,
          formatHistoryLine: (submitted) => {
            const labels = options.options
              .filter((entry) => submitted.includes(entry.value))
              .map((entry) => entry.label)
            return `? ${message} ${labels.length > 0 ? labels.join(', ') : '(none)'}`
          }
        }, rendererSession)

        if (isOpenTuiCancel(value) || isCancel(value)) cancelAndThrow()

        const picked = value ?? []
        const min = options.min ?? 0
        const max = options.max

        if (min > 0 && picked.length < min) {
          console.error(formatErrorLine(`Please select at least ${min} option(s).`))
          continue
        }

        if (typeof max === 'number' && picked.length > max) {
          console.error(formatErrorLine(`Please select at most ${max} option(s).`))
          continue
        }

        return picked
      }
    })
  }

  const sessionSpinner = (options?: SpinnerOptions | string): Spinner => {
    const config: SpinnerOptions =
      typeof options === 'string'
        ? { text: options }
        : options ?? {}

    const framesByAnimation: Record<SpinnerAnimation, string[]> = {
      line: ['-', '\\', '|', '/'],
      dots: ['.  ', '.. ', '...', ' ..', '  .'],
      braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
    }

    const frames = framesByAnimation[config.animation ?? 'braille'] ?? framesByAnimation.dots
    const intervalMs = config.intervalMs ?? 80
    let frameIndex = 0
    let timer: ReturnType<typeof setInterval> | null = null
    let running = false
    let currentText = config.text ?? ''
    let startedAt = 0

    const elapsedSuffix = () =>
      config.showTimer && startedAt > 0
        ? ` (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`
        : ''

    const stopTimer = () => {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    const renderFrame = () => {
      if (!running) return
      const frame = frames[frameIndex % frames.length] ?? '-'
      frameIndex += 1
      rendererSession.renderStatusLine(`${frame} ${currentText}${elapsedSuffix()}`, '#6ac4ff')
    }

    const settle = (tone: 'success' | 'error' | 'warning' | 'info', text?: string) => {
      if (text !== undefined) currentText = text
      stopTimer()
      running = false
      rendererSession.clearStatusLine()

      const value = `${currentText}${elapsedSuffix()}`
      if (!value.trim()) return

      const line =
        tone === 'success'
          ? formatSuccessLine(value)
          : tone === 'error'
            ? formatErrorLine(value)
            : tone === 'warning'
              ? formatWarningLine(value)
              : formatInfoLine(value)
      console.log(line)
    }

    return {
      start(text) {
        if (text !== undefined) currentText = text
        startedAt = Date.now()
        running = true

        if (!process.stdout.isTTY) {
          if (currentText) console.log(formatInfoLine(currentText))
          return
        }

        stopTimer()
        renderFrame()
        timer = setInterval(renderFrame, intervalMs)
      },
      stop(text) {
        if (text !== undefined) currentText = text
        stopTimer()
        running = false
        rendererSession.clearStatusLine()

        const value = `${currentText}${elapsedSuffix()}`
        if (value.trim()) process.stdout.write(`${value}\n`)
      },
      succeed(text) {
        settle('success', text)
      },
      fail(text) {
        settle('error', text)
      },
      warn(text) {
        settle('warning', text)
      },
      info(text) {
        settle('info', text)
      },
      update(text) {
        currentText = text
        if (!process.stdout.isTTY) {
          console.log(formatInfoLine(text))
          return
        }

        if (!running) {
          rendererSession.renderStatusLine(`- ${currentText}`, '#6ac4ff')
          return
        }

        renderFrame()
      }
    }
  }

  const sessionIntro: typeof intro = (...args) => {
    const [message] = args
    appendHistory(['', ...stripAnsi(formatIntroLine(message)).split('\n')])
  }

  const sessionOutro: typeof outro = (...args) => {
    const [message] = args
    appendHistory(['', stripAnsi(formatOutroLine(message)), ''])
  }

  const sessionNote: typeof note = (...args) => {
    const [message, title] = args
    const bodyLines = message
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line, index, lines) => {
        if (line.length > 0) return true
        const hasContentAfter = lines.slice(index + 1).some((candidate) => candidate.length > 0)
        return hasContentAfter
      })

    if (title) {
      const section = title.trim()
      const contentLines = bodyLines.length > 0 ? bodyLines : ['']
      const nonEmptyContent = contentLines.filter((line) => line.trim().length > 0)

      if (section.toLowerCase() === 'step' && nonEmptyContent.length > 0) {
        appendHistory(['', `● ${nonEmptyContent[0]}`])
        return
      }

      appendHistory(['', `${promptStyle.symbols.section} ${section}`])
      appendHistory(contentLines.map((line) => `${promptStyle.symbols.rail} ${line}`))
      return
    }

    appendHistory((bodyLines.length > 0 ? bodyLines : ['']).map((line) => `${promptStyle.symbols.rail} ${line}`))
  }

  const sessionCancel: typeof cancel = (...args) => {
    const [message = 'Cancelled'] = args
    appendHistory([stripAnsi(formatWarningLine(message))])
  }

  const sessionLog: typeof log = {
    info(message) {
      appendHistory([stripAnsi(formatInfoLine(message))])
    },
    success(message) {
      appendHistory([stripAnsi(formatSuccessLine(message))])
    },
    warn(message) {
      appendHistory([stripAnsi(formatWarningLine(message))])
    },
    error(message) {
      appendHistory([stripAnsi(formatErrorLine(message))])
    }
  }

  const sessionPrompt = Object.assign(sessionText, {
    confirm: sessionConfirm,
    select: sessionSelect,
    multiselect: sessionMultiSelect,
    password: sessionPassword,
    text: sessionText,
    group,
    intro: sessionIntro,
    outro: sessionOutro,
    note: sessionNote,
    log: sessionLog,
    cancel: sessionCancel,
    isCancel,
    spinner: sessionSpinner
  }) as PromptApi

  return {
    initialize: () => rendererSession.initialize(),
    prompt: sessionPrompt,
    spinner: sessionSpinner,
    async dispose() {
      await runQueued(async () => undefined)
      rendererSession.clearStatusLine()
      await rendererSession.dispose()
      flushHistory()
    }
  }
}

export interface PromptApi {
  <T = string>(message: string, options?: PromptOptions): Promise<T>
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>
  select<T = string>(message: string, options: SelectOptions<T>): Promise<T>
  password<T = string>(message: string, options?: PromptOptions): Promise<T>
  text(message: string, options?: PromptOptions): Promise<string>
  multiselect<T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]>
  group<T extends Record<string, () => Promise<unknown>>>(steps: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>
  intro: typeof intro
  outro: typeof outro
  note: typeof note
  log: typeof log
  cancel: typeof cancel
  isCancel: typeof isCancel
  spinner: typeof spinner
}

export const prompt = Object.assign(text, {
  confirm,
  select,
  multiselect,
  password,
  text,
  group,
  intro,
  outro,
  note,
  log,
  cancel,
  isCancel,
  spinner
}) as PromptApi

export type BunliPrompt = PromptApi
