/** @jsxImportSource @opentui/react */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import type { KeyEvent, ScrollBoxRenderable, TextareaRenderable } from '@opentui/core'
import Fuse from 'fuse.js'
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
  multiline?: boolean
  charLimit?: number
  height?: number
  inline?: boolean
  hint?: string
  resolve: PromptResolver<string>
}

export function TextPromptView({
  message,
  placeholder,
  defaultValue = '',
  validate,
  multiline = false,
  charLimit,
  height,
  inline = false,
  hint,
  resolve
}: TextPromptViewProps) {
  const [value, setValue] = useState(defaultValue)
  const valueRef = useRef(defaultValue)
  const textareaRef = useRef<TextareaRenderable | null>(null)
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

  useKeyboard((event) => {
    if (!multiline) return
    if (isCtrlCKeyboardEvent(event)) {
      event.preventDefault?.()
      event.stopPropagation?.()
      emitInterruptSignal('textPrompt')
      return
    }
    if (event.ctrl && (event.name === 'd' || event.name === 's')) {
      event.preventDefault?.()
      event.stopPropagation?.()
      onSubmit(valueRef.current)
    }
  })

  const helperText = hint ?? (multiline ? 'Ctrl+D submit • Esc cancel' : 'Enter submit • Esc cancel')

  if (multiline) {
    return (
      <box style={{ flexDirection: 'column', gap: 1 }}>
        <text content={`? ${message}`} />
        <box border height={height ?? 7} style={{ borderColor: error ? '#ff6b6b' : '#8fa1b5' }}>
          <textarea
            ref={textareaRef}
            initialValue={defaultValue}
            placeholder={placeholder}
            focused
            onContentChange={() => {
              let next = textareaRef.current?.plainText ?? ''
              if (charLimit && next.length > charLimit) {
                next = next.slice(0, charLimit)
                textareaRef.current?.setText(next)
              }
              setValue(next)
              valueRef.current = next
              if (error) setError(undefined)
            }}
          />
        </box>
        <box style={{ flexDirection: 'row', gap: 2 }}>
          {charLimit
            ? (
              <text
                content={`${value.length}/${charLimit}`}
                fg={value.length >= charLimit ? '#ffd166' : '#8fa1b5'}
              />
              )
            : null}
          <text content={helperText} fg='#8fa1b5' />
        </box>
        {error ? <text content={`ERR ${error}`} fg='#ff6b6b' /> : null}
      </box>
    )
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
      {error ? <text content={`ERR ${error}`} fg='#ff6b6b' /> : <text content={helperText} fg='#8fa1b5' />}
    </box>
  )
}

interface ConfirmPromptViewProps {
  message: string
  initialValue?: boolean
  affirmativeLabel?: string
  negativeLabel?: string
  timeout?: number
  resolve: PromptResolver<boolean>
}

export function ConfirmPromptView({
  message,
  initialValue = false,
  affirmativeLabel = 'Yes',
  negativeLabel = 'No',
  timeout,
  resolve
}: ConfirmPromptViewProps) {
  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  useEffect(() => {
    if (typeof timeout !== 'number' || timeout <= 0) return
    const timer = setTimeout(() => {
      resolve(initialValue)
    }, timeout * 1000)
    return () => clearTimeout(timer)
  }, [initialValue, resolve, timeout])

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <Menu
        title='Choose'
        boxed={false}
        initialIndex={initialValue ? 0 : 1}
        items={[
          { key: 'yes', label: affirmativeLabel },
          { key: 'no', label: negativeLabel }
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
      <text
        content={
          typeof timeout === 'number' && timeout > 0
            ? `Up/Down or y/n • Enter submit • Esc cancel • ${timeout}s timeout`
            : 'Up/Down or y/n • Enter submit • Esc cancel'
        }
        fg='#8fa1b5'
      />
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
  ordered?: boolean
  height?: number
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
  ordered = false,
  height = 10,
  resolve
}: MultiSelectPromptViewProps<T>) {
  const selectableValues = useMemo(
    () => new Set(options.filter((entry) => !entry.disabled).map((entry) => entry.value)),
    [options]
  )

  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    const next: number[] = []
    for (const value of initialValues) {
      const index = options.findIndex((entry) => entry.value === value && selectableValues.has(value))
      if (index >= 0) next.push(index)
    }
    return next
  })
  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices])

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
      setSelectedIndices((prev) => {
        if (prev.includes(activeIndex)) {
          return prev.filter((index) => index !== activeIndex)
        }
        return [...prev, activeIndex]
      })
      setError(undefined)
      return
    }

    if (event.ctrl && event.name === 'a') {
      setSelectedIndices((prev) => {
        const enabledIndices = options
          .map((entry, index) => (entry.disabled ? -1 : index))
          .filter((index) => index >= 0)
        const allSelected = enabledIndices.every((index) => prev.includes(index))
        if (allSelected) return []
        return enabledIndices
      })
      setError(undefined)
      return
    }

    if (promptKeymap.match('submit', event)) {
      const indices = ordered
        ? selectedIndices
        : [...selectedIndices].sort((a, b) => a - b)
      const values = indices
        .map((index) => options[index])
        .filter((entry): entry is OpenTuiSelectOption<T> => Boolean(entry) && !entry.disabled)
        .map((entry) => entry.value)

      if (required && values.length === 0) {
        setError('Select at least one option.')
        return
      }

      resolve(values)
    }
  })

  const pageOffset = Math.max(0, Math.min(activeIndex - Math.floor(height / 2), Math.max(0, options.length - height)))
  const visibleOptions = options.slice(pageOffset, pageOffset + height)

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {visibleOptions.map((entry, visIndex) => {
          const index = pageOffset + visIndex
          const focused = index === activeIndex
          const picked = selectedSet.has(index)
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
      {error
        ? <text content={`ERR ${error}`} fg='#ff6b6b' />
        : <text content='Space toggle • Ctrl+A all • Enter submit • Esc cancel' fg='#8fa1b5' />}
    </box>
  )
}

interface FilterPromptViewProps<T = string> {
  message: string
  options: OpenTuiSelectOption<T>[]
  placeholder?: string
  prompt?: string
  multiple?: boolean
  limit?: number
  fuzzy?: boolean
  reverse?: boolean
  selectIfOne?: boolean
  height?: number
  resolve: PromptResolver<T | T[]>
}

interface FilterResult<T> {
  item: OpenTuiSelectOption<T>
  refIndex: number
}

const filterKeymap = createKeyMatcher({
  up: ['up'],
  down: ['down'],
  toggle: ['tab', 'space'],
  submit: ['enter']
})

export function FilterPromptView<T = string>({
  message,
  options,
  placeholder = 'Type to filter...',
  prompt = '> ',
  multiple = false,
  limit = 0,
  fuzzy = true,
  reverse = false,
  selectIfOne = false,
  height = 10,
  resolve
}: FilterPromptViewProps<T>) {
  const [query, setQuery] = useState('')
  const [cursorIndex, setCursorIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ['label'],
        threshold: 0.3,
        ignoreLocation: true
      }),
    [options]
  )

  const filtered: FilterResult<T>[] = useMemo(() => {
    if (!query) {
      return options.map((item, index) => ({ item, refIndex: index }))
    }
    if (fuzzy) {
      return fuse.search(query).map((result) => ({ item: result.item, refIndex: result.refIndex }))
    }
    return options
      .map((item, index) => ({ item, refIndex: index }))
      .filter(({ item }) => item.label.toLowerCase().includes(query.toLowerCase()))
  }, [fuse, fuzzy, options, query])

  const orderedFiltered = useMemo(() => (reverse ? [...filtered].reverse() : filtered), [filtered, reverse])

  useCancelKey(() => resolve(OPEN_TUI_CANCEL))

  useEffect(() => {
    setCursorIndex((prev) => {
      if (orderedFiltered.length === 0) return 0
      return Math.min(prev, orderedFiltered.length - 1)
    })
  }, [orderedFiltered.length])

  useEffect(() => {
    if (selectIfOne && orderedFiltered.length === 1 && query.length > 0) {
      const onlyResult = orderedFiltered[0]
      if (!onlyResult || onlyResult.item.disabled) return
      if (multiple) resolve([onlyResult.item.value])
      else resolve(onlyResult.item.value)
    }
  }, [multiple, orderedFiltered, query, resolve, selectIfOne])

  useKeyboard((event) => {
    if (filterKeymap.match('up', event)) {
      setCursorIndex((prev) => {
        if (orderedFiltered.length === 0) return 0
        return (prev - 1 + orderedFiltered.length) % orderedFiltered.length
      })
      return
    }

    if (filterKeymap.match('down', event)) {
      setCursorIndex((prev) => {
        if (orderedFiltered.length === 0) return 0
        return (prev + 1) % orderedFiltered.length
      })
      return
    }

    if (multiple && filterKeymap.match('toggle', event)) {
      const result = orderedFiltered[cursorIndex]
      if (!result || result.item.disabled) return
      setSelectedIndices((prev) => {
        const next = new Set(prev)
        if (next.has(result.refIndex)) {
          next.delete(result.refIndex)
          return next
        }
        if (limit > 0 && next.size >= limit) return prev
        next.add(result.refIndex)
        return next
      })
      return
    }

    if (promptKeymap.match('submit', event)) {
      if (multiple) {
        const values = options
          .filter((entry, index) => !entry.disabled && selectedIndices.has(index))
          .map((entry) => entry.value)
        resolve(values)
        return
      }

      const result = orderedFiltered[cursorIndex]
      if (result && !result.item.disabled) {
        resolve(result.item.value)
      }
    }
  })

  const pageOffset = Math.max(0, Math.min(cursorIndex - Math.floor(height / 2), Math.max(0, orderedFiltered.length - height)))
  const visibleResults = orderedFiltered.slice(pageOffset, pageOffset + height)

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text content={`? ${message}`} />
      <box style={{ flexDirection: 'row' }}>
        <text content={prompt} />
        <input value={query} placeholder={placeholder} focused onInput={setQuery} />
      </box>
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {visibleResults.map((result, visIndex) => {
          const absoluteIndex = pageOffset + visIndex
          const isCursor = absoluteIndex === cursorIndex
          const isSelected = selectedIndices.has(result.refIndex)
          const marker = multiple ? (isSelected ? '[x] ' : '[ ] ') : ''
          const disabled = result.item.disabled ? ' [disabled]' : ''
          return (
            <text
              key={`${result.item.label}:${result.refIndex}`}
              content={`${isCursor ? '>' : ' '} ${marker}${result.item.label}${disabled}`}
              fg={result.item.disabled ? '#8fa1b5' : isCursor ? '#6ac4ff' : '#f4f7fb'}
            />
          )
        })}
      </box>
      <text
        content={
          multiple
            ? `${orderedFiltered.length}/${options.length} • Tab toggle • Enter submit • Esc cancel`
            : `${orderedFiltered.length}/${options.length} • Enter select • Esc cancel`
        }
        fg='#8fa1b5'
      />
    </box>
  )
}

interface PagerPromptViewProps {
  content: string
  title?: string
  showLineNumbers?: boolean
  height?: number | `${number}%` | 'auto'
  width?: number | `${number}%` | 'auto'
  resolve: PromptResolver<void>
}

type PagerMode = 'normal' | 'search'

const pagerKeymap = createKeyMatcher({
  scrollDown: ['down', 'j'],
  scrollUp: ['up', 'k'],
  halfPageDown: ['d'],
  halfPageUp: ['u'],
  top: ['g', 'home'],
  bottom: ['end'],
  search: ['/'],
  nextMatch: ['n'],
  prevMatch: ['shift+n'],
  quit: ['q', 'escape']
})

function padLineNumber(lineNum: number, totalLines: number): string {
  return String(lineNum).padStart(String(totalLines).length, ' ')
}

function findMatchIndices(lines: string[], query: string): number[] {
  if (!query) return []
  const lowerQuery = query.toLowerCase()
  const indices: number[] = []
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.toLowerCase().includes(lowerQuery)) {
      indices.push(index)
    }
  }
  return indices
}

export function PagerPromptView({
  content,
  title,
  showLineNumbers = false,
  height,
  width,
  resolve
}: PagerPromptViewProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null)
  const [mode, setMode] = useState<PagerMode>('normal')
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndices, setMatchIndices] = useState<number[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const lines = useMemo(() => content.split('\n'), [content])

  const scrollToLine = useCallback((lineIndex: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = lineIndex
    }
  }, [])

  const executeSearch = useCallback(() => {
    const indices = findMatchIndices(lines, searchQuery)
    setMatchIndices(indices)
    setCurrentMatchIndex(0)
    setMode('normal')
    if (indices[0] !== undefined) {
      scrollToLine(indices[0])
    }
  }, [lines, scrollToLine, searchQuery])

  useKeyboard((event: KeyEvent) => {
    if (isCtrlCKeyboardEvent(event)) {
      event.preventDefault?.()
      event.stopPropagation?.()
      emitInterruptSignal('pager')
      return
    }

    if (mode === 'search') {
      if (isEscapeKeyboardEvent(event)) {
        event.preventDefault?.()
        event.stopPropagation?.()
        setSearchQuery('')
        setMode('normal')
        return
      }

      if (event.name === 'return' || event.sequence === '\r' || event.sequence === '\n') {
        event.preventDefault?.()
        event.stopPropagation?.()
        executeSearch()
      }
      return
    }

    if (pagerKeymap.match('scrollDown', event)) {
      scrollToLine((scrollRef.current?.scrollTop ?? 0) + 1)
      return
    }

    if (pagerKeymap.match('scrollUp', event)) {
      scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - 1))
      return
    }

    if (event.ctrl && event.name === 'd') {
      scrollToLine((scrollRef.current?.scrollTop ?? 0) + Math.max(1, Math.floor(lines.length / 4)))
      return
    }

    if (event.ctrl && event.name === 'u') {
      scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - Math.max(1, Math.floor(lines.length / 4))))
      return
    }

    if (pagerKeymap.match('halfPageDown', event) && !event.ctrl) {
      scrollToLine((scrollRef.current?.scrollTop ?? 0) + Math.max(1, Math.floor(lines.length / 4)))
      return
    }

    if (pagerKeymap.match('halfPageUp', event) && !event.ctrl) {
      scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - Math.max(1, Math.floor(lines.length / 4))))
      return
    }

    if (pagerKeymap.match('top', event)) {
      scrollToLine(0)
      return
    }

    if ((event.name === 'g' && event.shift) || event.name === 'G' || pagerKeymap.match('bottom', event)) {
      scrollToLine(Math.max(0, lines.length - 1))
      return
    }

    if (pagerKeymap.match('search', event)) {
      setMode('search')
      setSearchQuery('')
      return
    }

    if (pagerKeymap.match('nextMatch', event) && matchIndices.length > 0) {
      const nextIndex = (currentMatchIndex + 1) % matchIndices.length
      setCurrentMatchIndex(nextIndex)
      scrollToLine(matchIndices[nextIndex] ?? 0)
      return
    }

    if (pagerKeymap.match('prevMatch', event) && matchIndices.length > 0) {
      const nextIndex = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length
      setCurrentMatchIndex(nextIndex)
      scrollToLine(matchIndices[nextIndex] ?? 0)
      return
    }

    if (pagerKeymap.match('quit', event)) {
      event.preventDefault?.()
      event.stopPropagation?.()
      resolve(undefined)
    }
  })

  return (
    <box border height={height} width={width} style={{ flexDirection: 'column' }}>
      {title ? <text content={title} /> : null}
      <scrollbox
        ref={scrollRef}
        flexGrow={1}
        focused={mode === 'normal'}
        scrollY
        viewportOptions={{ width: '100%' }}
        contentOptions={{ width: '100%' }}
      >
        {lines.map((line, index) => (
          <text
            key={index}
            content={showLineNumbers ? `${padLineNumber(index + 1, lines.length)} ${line}` : line}
            fg={matchIndices.includes(index) ? '#6ac4ff' : '#f4f7fb'}
          />
        ))}
      </scrollbox>
      {mode === 'search'
        ? (
          <box style={{ flexDirection: 'row' }}>
            <text content='/' />
            <input
              value={searchQuery}
              placeholder='Search...'
              focused
              onInput={setSearchQuery}
              onSubmit={executeSearch}
            />
          </box>
          )
        : null}
      <text
        content={
          matchIndices.length > 0
            ? `Match ${currentMatchIndex + 1}/${matchIndices.length} • / search • n/N next/prev • q quit`
            : '/ search • q quit'
        }
        fg='#8fa1b5'
      />
    </box>
  )
}
