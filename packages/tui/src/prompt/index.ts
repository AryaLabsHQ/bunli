import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'

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
    question: string
    success: string
    error: string
    info: string
    warning: string
    selected: string
    unselected: string
  }
}

function shouldUseColor(): boolean {
  if (process.env.NO_COLOR) return false
  return Boolean(process.stdout.isTTY)
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

const promptStyle: PromptStyle = {
  useColor: shouldUseColor(),
  symbols: {
    pointer: '>',
    question: '?',
    success: 'OK',
    error: 'ERR',
    info: 'INFO',
    warning: 'WARN',
    selected: '[x]',
    unselected: '[ ]'
  }
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

async function askLine(message: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const promptLabel = defaultValue !== undefined
    ? `${formatQuestionLabel(message)} ${dim(promptStyle, `(${defaultValue})`)} `
    : `${formatQuestionLabel(message)} `

  try {
    const answer = await rl.question(promptLabel)
    if (answer.length === 0 && defaultValue !== undefined) return defaultValue
    return answer
  } finally {
    rl.close()
  }
}

function isPrintableKey(event: KeypressEvent): boolean {
  if (!event.sequence) return false
  if (event.ctrl || event.meta) return false
  return event.sequence.length === 1 && event.sequence >= ' '
}

function isCancelKey(key: KeypressEvent): boolean {
  return (key.ctrl && key.name === 'c') || key.name === 'escape'
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

function writeStatusLine(text: string) {
  process.stdout.write(`\r\x1b[2K${text}`)
}

function clearStatusLine() {
  process.stdout.write('\r\x1b[2K')
}

function formatQuestionLabel(message: string): string {
  return `${cyan(promptStyle, promptStyle.symbols.question)} ${bold(promptStyle, message)}`
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
  return formatInfoLine(`== ${message} ==`)
}

function formatOutroLine(message: string): string {
  return formatSuccessLine(`== ${message} ==`)
}

function formatNoteLines(message: string, title?: string): string[] {
  const bodyLines = message
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  if (!title) {
    return [formatInfoLine(message)]
  }

  return [
    formatInfoLine(title),
    ...bodyLines.map((line) => `${dim(promptStyle, '|')} ${line}`)
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
    const pointer = active ? cyan(promptStyle, promptStyle.symbols.pointer) : ' '
    const numeric = dim(promptStyle, `${index + 1}.`)
    const label = option.disabled ? dim(promptStyle, option.label) : option.label
    const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
    const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
    lines.push(`${pointer} ${numeric} ${label}${hint}${disabled}`)
  }

  return lines
}

function renderMultiSelectFrame<T>(args: {
  message: string
  options: SelectOption<T>[]
  selectedIndex: number
  selected: Set<T>
  errorMessage?: string
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
    const pointer = active ? cyan(promptStyle, promptStyle.symbols.pointer) : ' '
    const checkmark = args.selected.has(option.value)
      ? green(promptStyle, promptStyle.symbols.selected)
      : dim(promptStyle, promptStyle.symbols.unselected)
    const numeric = dim(promptStyle, `${index + 1}.`)
    const label = option.disabled ? dim(promptStyle, option.label) : option.label
    const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
    const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
    lines.push(`${pointer} ${numeric} ${checkmark} ${label}${hint}${disabled}`)
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
      chars.push(key.sequence as string)
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

  const readKey = () =>
    new Promise<KeypressEvent>((resolve) => {
      const onKeypress = (sequence: string, key: KeypressEvent) => {
        stdin.off('keypress', onKeypress)
        resolve(key ?? { sequence })
      }
      stdin.on('keypress', onKeypress)
    })

  try {
    return await run(readKey)
  } finally {
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
        chars.push(key.sequence as string)
        render()
      }
    }
  })
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

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const lines = renderSelectFrame({
        message: args.message,
        options: args.options,
        selectedIndex
      })
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

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const lines = renderMultiSelectFrame({
        message: args.message,
        options: args.options,
        selectedIndex,
        selected,
        errorMessage
      })
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
  stop(text?: string): void
  message(text: string): void
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
  spinner(): RawSpinner
}

function findOptionByToken<T>(token: string, options: SelectOption<T>[]): SelectOption<T> | undefined {
  const asNumber = Number.parseInt(token, 10)
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1]
  }
  return options.find((option) => String(option.value) === token)
}

const defaultDriver: PromptDriver = {
  async text(args) {
    while (true) {
      const value = await askLine(args.message, args.defaultValue)
      const validationError = args.validate?.(value)
      if (validationError) {
        console.error(formatErrorLine(validationError))
        continue
      }
      return value
    }
  },

  async password(args) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      return askPasswordWithReveal(args)
    }

    while (true) {
      const value = await askLine(args.message)
      const validationError = args.validate?.(value)
      if (validationError) {
        console.error(formatErrorLine(validationError))
        continue
      }
      return value
    }
  },

  async confirm(args) {
    const defaultValue = args.initialValue ?? false
    const suffix = defaultValue ? '[Y/n]' : '[y/N]'

    while (true) {
      const value = (await askLine(`${args.message} ${suffix}`)).trim().toLowerCase()
      if (value === '') return defaultValue
      if (['y', 'yes'].includes(value)) return true
      if (['n', 'no'].includes(value)) return false
      console.error(formatErrorLine('Please answer with y/yes or n/no.'))
    }
  },

  async select<T>(args: { message: string; options: SelectOption<T>[]; initialValue?: T }): Promise<T | Cancel> {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      return askSelectWithKeyboard(args)
    }

    console.log(formatQuestionLabel(args.message))
    args.options.forEach((option, index) => {
      const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
      const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
      console.log(`  ${dim(promptStyle, `${index + 1}.`)} ${option.label}${hint}${disabled}`)
    })

    while (true) {
      const answer = (await askLine('Select option:')).trim()
      if (answer === '' && args.initialValue !== undefined) return args.initialValue

      const picked = findOptionByToken(answer, args.options)
      if (!picked) {
        console.error(formatErrorLine('Invalid selection. Enter the option number or value.'))
        continue
      }
      if (picked.disabled) {
        console.error(formatErrorLine('Selected option is disabled.'))
        continue
      }
      return picked.value
    }
  },

  async multiselect<T>(args: {
    message: string
    options: SelectOption<T>[]
    initialValues?: T[]
    required?: boolean
  }): Promise<T[] | Cancel> {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      return askMultiSelectWithKeyboard(args)
    }

    console.log(formatQuestionLabel(args.message))
    args.options.forEach((option, index) => {
      const disabled = option.disabled ? dim(promptStyle, ' [disabled]') : ''
      const hint = option.hint ? dim(promptStyle, ` (${option.hint})`) : ''
      console.log(`  ${dim(promptStyle, `${index + 1}.`)} ${option.label}${hint}${disabled}`)
    })
    console.log(dim(promptStyle, 'Enter comma-separated option numbers or values.'))

    while (true) {
      const answer = (await askLine('Select options:')).trim()
      if (answer === '') {
        if (args.initialValues && args.initialValues.length > 0) return args.initialValues
        if (args.required) {
          console.error(formatErrorLine('Select at least one option.'))
          continue
        }
        return []
      }

      const tokens = answer
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)

      const selected = new Set<T>()
      let invalidToken: string | null = null

      for (const token of tokens) {
        const option = findOptionByToken(token, args.options)
        if (!option || option.disabled) {
          invalidToken = token
          break
        }
        selected.add(option.value)
      }

      if (invalidToken) {
        console.error(formatErrorLine(`Invalid selection: ${invalidToken}`))
        continue
      }

      const values = Array.from(selected)
      if (args.required && values.length === 0) {
        console.error(formatErrorLine('Select at least one option.'))
        continue
      }

      return values
    }
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

  spinner() {
    const frames = ['-', '\\', '|', '/']
    let frameIndex = 0
    let timer: ReturnType<typeof setInterval> | null = null
    let running = false
    let currentText = ''

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const render = () => {
      if (!running) return
      const frame = frames[frameIndex % frames.length] ?? '-'
      frameIndex += 1
      writeStatusLine(`${cyan(promptStyle, frame)} ${currentText}`)
    }

    return {
      start(text) {
        currentText = text ?? currentText
        running = true

        if (!process.stdout.isTTY) {
          if (currentText) console.log(formatInfoLine(currentText))
          return
        }

        stopTimer()
        render()
        timer = setInterval(render, 80)
      },
      stop(text) {
        if (text) {
          currentText = text
        }

        if (!process.stdout.isTTY) {
          if (currentText) console.log(formatSuccessLine(currentText))
          running = false
          return
        }

        stopTimer()
        running = false
        clearStatusLine()
        if (currentText) {
          process.stdout.write(`${formatSuccessLine(currentText)}\n`)
        }
      },
      message(text) {
        currentText = text
        if (!process.stdout.isTTY) {
          console.log(formatInfoLine(text))
          return
        }
        if (!running) {
          writeStatusLine(`${cyan(promptStyle, '-')} ${currentText}`)
          return
        }
        render()
      }
    }
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
  isCIEnvironmentFromEnv
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
  isCancel
}) as PromptApi

export type BunliPrompt = PromptApi
