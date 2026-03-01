/** @jsxImportSource @opentui/react */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import { Menu } from '../../components/menu.js'
import { createKeyMatcher } from '../../components/keymap.js'
import {
  emitInterruptSignal,
  isCancelKeyboardEvent,
  isCtrlCKeyboardEvent,
  isEscapeKeyboardEvent,
  useCancelKey
} from '../runtime/open-tui-cancel.js'
import { OPEN_TUI_CANCEL, type OpenTuiSelectOption, type PromptResolver } from '../runtime/open-tui-types.js'

const promptKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  toggle: ['space'],
  submit: ['enter']
})

interface TextPromptViewProps {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | undefined
  inline?: boolean
  hint?: string
  resolve: PromptResolver<string>
}

export function TextPromptView({
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

  const onSubmit = (submitted: string | unknown) => {
    const submittedValue = typeof submitted === 'string' ? submitted : valueRef.current
    const validationError = validate?.(submittedValue)
    if (validationError) {
      setError(validationError)
      return
    }
    resolve(submittedValue)
  }

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
              onSubmit={onSubmit}
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
              onSubmit={onSubmit}
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

export function ConfirmPromptView({ message, initialValue = false, resolve }: ConfirmPromptViewProps) {
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

interface SelectPromptViewProps<T = string> {
  message: string
  options: OpenTuiSelectOption<T>[]
  initialValue?: T
  resolve: PromptResolver<T>
}

export function SelectPromptView<T = string>({
  message,
  options,
  initialValue,
  resolve
}: SelectPromptViewProps<T>) {
  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  const firstEnabledIndex = useMemo(() => options.findIndex((entry) => !entry.disabled), [options])

  const initialIndex = useMemo(() => {
    if (initialValue !== undefined) {
      const index = options.findIndex((entry) => entry.value === initialValue && !entry.disabled)
      if (index >= 0) return index
    }
    return Math.max(0, firstEnabledIndex)
  }, [firstEnabledIndex, initialValue, options])

  useEffect(() => {
    if (firstEnabledIndex >= 0) return
    resolve(OPEN_TUI_CANCEL)
  }, [firstEnabledIndex, resolve])

  if (firstEnabledIndex < 0) {
    return (
      <box style={{ flexDirection: 'column', gap: 1 }}>
        <text content={`? ${message}`} />
        <text content='ERR No selectable options are available.' fg='#ff6b6b' />
        <text content='Esc cancel' fg='#8fa1b5' />
      </box>
    )
  }

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

export function MultiSelectPromptView<T = string>({
  message,
  options,
  initialValues = [],
  required = false,
  resolve
}: MultiSelectPromptViewProps<T>) {
  const selectableValues = useMemo(
    () => new Set(options.filter((entry) => !entry.disabled).map((entry) => entry.value)),
    [options]
  )

  const [selected, setSelected] = useState<Set<T>>(() => {
    const next = new Set<T>()
    for (const value of initialValues) {
      if (selectableValues.has(value)) next.add(value)
    }
    return next
  })

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
        .filter((entry) => !entry.disabled && selected.has(entry.value))
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
