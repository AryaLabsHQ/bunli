import { useCallback, useId, useMemo, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useScopedKeyboard, createKeyMatcher, useTuiTheme } from '@bunli/runtime/app'

export interface ChooseOption {
  label: string
  value: string
  description?: string
  disabled?: boolean
}

export interface ChooseProps {
  options: ChooseOption[]
  mode?: 'single' | 'multiple'
  limit?: number
  ordered?: boolean
  height?: number
  cursor?: string
  selectedPrefix?: string
  unselectedPrefix?: string
  onSelect?: (selected: ChooseOption[]) => void
  onAbort?: () => void
  scopeId?: string
  keyboardEnabled?: boolean
}

const chooseKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  pageUp: ['left', 'h'],
  pageDown: ['right', 'l'],
  home: ['g', 'home'],
  end: ['end', 'G'],
  toggle: ['space', 'tab', 'x'],
  selectAll: ['a'],
  submit: ['enter'],
  abort: ['escape']
})

function nextEnabledIndex(options: ChooseOption[], from: number, delta: number): number {
  if (options.length === 0) return 0
  for (let step = 0; step < options.length; step += 1) {
    const next = (from + delta * (step + 1) + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return from
}

function firstEnabledIndex(options: ChooseOption[]): number {
  for (let i = 0; i < options.length; i++) {
    if (!options[i]?.disabled) return i
  }
  return 0
}

function lastEnabledIndex(options: ChooseOption[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i]?.disabled) return i
  }
  return 0
}

export function Choose({
  options,
  mode = 'single',
  limit = 0,
  ordered = false,
  height = 10,
  cursor = '>',
  selectedPrefix = '[x]',
  unselectedPrefix = '[ ]',
  onSelect,
  onAbort,
  scopeId,
  keyboardEnabled = true
}: ChooseProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `choose:${reactScopeId}`

  const [cursorIndex, setCursorIndex] = useState(() => firstEnabledIndex(options))
  const [pageOffset, setPageOffset] = useState(0)
  // For ordered mode, store indices in selection order; for unordered, use a Set
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices])

  const pageSize = height
  const totalPages = Math.max(1, Math.ceil(options.length / pageSize))

  const adjustPageOffset = useCallback((newCursorIndex: number, currentOffset: number): number => {
    if (newCursorIndex < currentOffset) {
      return newCursorIndex
    }
    if (newCursorIndex >= currentOffset + pageSize) {
      return newCursorIndex - pageSize + 1
    }
    return currentOffset
  }, [pageSize])

  const moveCursor = useCallback((delta: number) => {
    setCursorIndex((prev) => {
      const next = nextEnabledIndex(options, prev, delta)
      setPageOffset((offset) => adjustPageOffset(next, offset))
      return next
    })
  }, [options, adjustPageOffset])

  const movePage = useCallback((delta: number) => {
    setCursorIndex((prev) => {
      const targetIndex = Math.max(0, Math.min(options.length - 1, prev + delta * pageSize))
      // Find nearest enabled index from the target
      if (!options[targetIndex]?.disabled) {
        setPageOffset((offset) => adjustPageOffset(targetIndex, offset))
        return targetIndex
      }
      const next = nextEnabledIndex(options, targetIndex - (delta > 0 ? 1 : -1), delta > 0 ? 1 : -1)
      setPageOffset((offset) => adjustPageOffset(next, offset))
      return next
    })
  }, [options, pageSize, adjustPageOffset])

  const goHome = useCallback(() => {
    const idx = firstEnabledIndex(options)
    setCursorIndex(idx)
    setPageOffset(0)
  }, [options])

  const goEnd = useCallback(() => {
    const idx = lastEnabledIndex(options)
    setCursorIndex(idx)
    setPageOffset(Math.max(0, options.length - pageSize))
  }, [options, pageSize])

  const toggleIndex = useCallback((index: number) => {
    const option = options[index]
    if (!option || option.disabled) return

    setSelectedIndices((prev) => {
      const isSelected = prev.includes(index)
      if (isSelected) {
        return prev.filter((i) => i !== index)
      }
      if (limit > 0 && prev.length >= limit) {
        return prev
      }
      return [...prev, index]
    })
  }, [options, limit])

  const toggleAll = useCallback(() => {
    setSelectedIndices((prev) => {
      const enabledIndices = options
        .map((opt, i) => (!opt.disabled ? i : -1))
        .filter((i) => i !== -1)
      const allSelected = enabledIndices.every((i) => prev.includes(i))
      if (allSelected) {
        return []
      }
      if (limit > 0) {
        return enabledIndices.slice(0, limit)
      }
      return enabledIndices
    })
  }, [options, limit])

  const submit = useCallback(() => {
    if (mode === 'single') {
      const option = options[cursorIndex]
      if (option && !option.disabled) {
        onSelect?.([option])
      }
    } else {
      const indices = ordered
        ? selectedIndices
        : [...selectedIndices].sort((a, b) => a - b)
      const selected = indices
        .map((i) => options[i])
        .filter((opt): opt is ChooseOption => opt != null)
      onSelect?.(selected)
    }
  }, [mode, options, cursorIndex, selectedIndices, ordered, onSelect])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (chooseKeymap.match('abort', key)) {
        onAbort?.()
        return true
      }

      if (chooseKeymap.match('up', key)) {
        moveCursor(-1)
        return true
      }

      if (chooseKeymap.match('down', key)) {
        moveCursor(1)
        return true
      }

      if (chooseKeymap.match('pageUp', key)) {
        movePage(-1)
        return true
      }

      if (chooseKeymap.match('pageDown', key)) {
        movePage(1)
        return true
      }

      if (chooseKeymap.match('home', key)) {
        goHome()
        return true
      }

      // Handle shift+g for end (G)
      if ((key.name === 'g' && key.shift) || chooseKeymap.match('end', key)) {
        goEnd()
        return true
      }

      if (mode === 'multiple' && chooseKeymap.match('toggle', key)) {
        toggleIndex(cursorIndex)
        return true
      }

      if (mode === 'multiple' && chooseKeymap.match('selectAll', key)) {
        toggleAll()
        return true
      }

      if (chooseKeymap.match('submit', key)) {
        submit()
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  const visibleOptions = options.slice(pageOffset, pageOffset + pageSize)
  const currentPage = Math.floor(pageOffset / pageSize) + 1
  const hasMoreAbove = pageOffset > 0
  const hasMoreBelow = pageOffset + pageSize < options.length

  return (
    <box style={{ flexDirection: 'column' }}>
      {visibleOptions.map((option, visIndex) => {
        const globalIndex = pageOffset + visIndex
        const isCursor = globalIndex === cursorIndex
        const isSelected = selectedSet.has(globalIndex)
        const prefix = isCursor ? cursor : ' '.repeat(cursor.length)
        const selectionMarker = mode === 'multiple'
          ? (isSelected ? selectedPrefix : unselectedPrefix) + ' '
          : ''

        return (
          <text
            key={option.value}
            content={`${prefix} ${selectionMarker}${option.label}${option.description ? ` - ${option.description}` : ''}`}
            fg={option.disabled ? tokens.textMuted : isCursor ? tokens.accent : tokens.textPrimary}
          />
        )
      })}
      {(hasMoreAbove || hasMoreBelow) ? (
        <text
          content={
            hasMoreAbove && hasMoreBelow
              ? `(page ${currentPage}/${totalPages})`
              : hasMoreAbove
                ? '\u2191 more'
                : '\u2193 more'
          }
          fg={tokens.textMuted}
        />
      ) : null}
    </box>
  )
}
