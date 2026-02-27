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

function isCIEnvironment(): boolean {
  return Boolean(
    process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.CIRCLECI ||
      process.env.TRAVIS
  )
}

function canPrompt(mode?: PromptMode): boolean {
  if (mode === 'interactive') {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY)
  }
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && !isCIEnvironment())
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
  console.error('Invalid input:')
  for (const issue of error.issues) {
    console.error(`  - ${issue.message}`)
  }
  console.error()
}

async function askLine(message: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const promptLabel = defaultValue !== undefined ? `${message} (${defaultValue}) ` : `${message} `

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
  process.stdout.write(`${args.message}\n`)
  process.stdout.write('Press Ctrl+R to toggle reveal\n')

  const chars: string[] = []
  let revealed = false

  const render = () => {
    const display = revealed ? chars.join('') : '*'.repeat(chars.length)
    writeStatusLine(`Password: ${display}`)
  }

  return withRawKeyboard(async (readKey) => {
    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        process.stdout.write('\n')
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
          process.stdout.write('\n')
          console.error(validationError)
          chars.length = 0
          render()
          continue
        }
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
    console.error('No selectable options available.')
    return CANCEL
  }

  let selectedIndex = initialSelectableIndex(args.options, args.initialValue)
  process.stdout.write(`${args.message}\n`)
  args.options.forEach((option, index) => {
    const disabled = option.disabled ? ' (disabled)' : ''
    const hint = option.hint ? ` - ${option.hint}` : ''
    process.stdout.write(`  ${index + 1}) ${option.label}${hint}${disabled}\n`)
  })

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const current = args.options[selectedIndex]
      writeStatusLine(`Use ↑/↓ + Enter, or 1-${args.options.length}. Current: ${current?.label ?? 'none'}`)
    }

    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        process.stdout.write('\n')
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
    console.error('No selectable options available.')
    return CANCEL
  }

  let selectedIndex = initialSelectableIndex(args.options)
  const selected = new Set<T>(
    args.options
      .filter((option) => !option.disabled && args.initialValues?.includes(option.value))
      .map((option) => option.value)
  )

  process.stdout.write(`${args.message}\n`)
  args.options.forEach((option, index) => {
    const disabled = option.disabled ? ' (disabled)' : ''
    const hint = option.hint ? ` - ${option.hint}` : ''
    process.stdout.write(`  ${index + 1}) ${option.label}${hint}${disabled}\n`)
  })

  return withRawKeyboard(async (readKey) => {
    const render = () => {
      const current = args.options[selectedIndex]
      const selectedSummary = buildSelectedSummary(selected, args.options)
      writeStatusLine(
        `Use ↑/↓, Space toggle, Enter submit, 1-${args.options.length} toggle. Current: ${
          current?.label ?? 'none'
        } | Selected: ${selectedSummary}`
      )
    }

    render()

    while (true) {
      const key = await readKey()

      if (isCancelKey(key)) {
        process.stdout.write('\n')
        return CANCEL
      }

      const shortcutOption = resolveShortcutOption(key, args.options)
      if (shortcutOption && !shortcutOption.disabled) {
        toggleSelection(selected, shortcutOption)
        render()
        continue
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

      if (isMultiSelectToggleKey(key)) {
        const current = args.options[selectedIndex]
        if (current && !current.disabled) {
          toggleSelection(selected, current)
        }
        render()
        continue
      }

      if (isSubmitKey(key)) {
        const values = args.options
          .filter((option) => selected.has(option.value))
          .map((option) => option.value)

        if (args.required && values.length === 0) {
          writeStatusLine('Select at least one option.')
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
        console.error(validationError)
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
        console.error(validationError)
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
      console.error('Please answer with y/yes or n/no.')
    }
  },

  async select<T>(args: { message: string; options: SelectOption<T>[]; initialValue?: T }): Promise<T | Cancel> {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      return askSelectWithKeyboard(args)
    }

    console.log(args.message)
    args.options.forEach((option, index) => {
      const disabled = option.disabled ? ' (disabled)' : ''
      const hint = option.hint ? ` - ${option.hint}` : ''
      console.log(`  ${index + 1}) ${option.label}${hint}${disabled}`)
    })

    while (true) {
      const answer = (await askLine('Select option:')).trim()
      if (answer === '' && args.initialValue !== undefined) return args.initialValue

      const picked = findOptionByToken(answer, args.options)
      if (!picked) {
        console.error('Invalid selection. Enter the option number or value.')
        continue
      }
      if (picked.disabled) {
        console.error('Selected option is disabled.')
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

    console.log(args.message)
    args.options.forEach((option, index) => {
      const disabled = option.disabled ? ' (disabled)' : ''
      const hint = option.hint ? ` - ${option.hint}` : ''
      console.log(`  ${index + 1}) ${option.label}${hint}${disabled}`)
    })
    console.log('Enter comma-separated option numbers or values.')

    while (true) {
      const answer = (await askLine('Select options:')).trim()
      if (answer === '') {
        if (args.initialValues && args.initialValues.length > 0) return args.initialValues
        if (args.required) {
          console.error('Select at least one option.')
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
        console.error(`Invalid selection: ${invalidToken}`)
        continue
      }

      const values = Array.from(selected)
      if (args.required && values.length === 0) {
        console.error('Select at least one option.')
        continue
      }

      return values
    }
  },

  intro(message) {
    console.log(`\n${message}`)
  },

  outro(message) {
    console.log(`\n${message}`)
  },

  note(message, title) {
    if (title) {
      console.log(`${title}: ${message}`)
      return
    }
    console.log(message)
  },

  cancel(message = 'Cancelled') {
    console.log(message)
  },

  log: {
    info(message) {
      console.log(message)
    },
    success(message) {
      console.log(message)
    },
    warn(message) {
      console.warn(message)
    },
    error(message) {
      console.error(message)
    }
  },

  spinner() {
    return {
      start(text) {
        if (text) console.log(text)
      },
      stop(text) {
        if (text) console.log(text)
      },
      message(text) {
        console.log(text)
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
  canPrompt
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
      console.error(`Please select at least ${min} option(s).`)
      continue
    }

    if (typeof max === 'number' && picked.length > max) {
      console.error(`Please select at most ${max} option(s).`)
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
export const log = runtime.log
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
