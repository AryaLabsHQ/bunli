import { useEffect, useId, useMemo, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useScopedKeyboard, createKeyMatcher, useTuiTheme } from '@bunli/runtime/app'
import Fuse, { type FuseResultMatch } from 'fuse.js'

export interface FilterOption {
  label: string
  value: string
  description?: string
}

export interface FilterProps {
  options: FilterOption[]
  placeholder?: string
  prompt?: string
  mode?: 'single' | 'multiple'
  limit?: number
  fuzzy?: boolean
  reverse?: boolean
  selectIfOne?: boolean
  height?: number
  onSelect?: (selected: FilterOption[]) => void
  onAbort?: () => void
  scopeId?: string
  keyboardEnabled?: boolean
}

interface FilterResult {
  item: FilterOption
  matches?: ReadonlyArray<FuseResultMatch>
  refIndex: number
}

const filterKeymap = createKeyMatcher({
  up: ['up'],
  down: ['down'],
  toggle: ['tab'],
  selectAll: ['ctrl+a'],
  submit: ['enter'],
  abort: ['escape']
})

export function Filter({
  options,
  placeholder = 'Type to filter...',
  prompt = '> ',
  mode = 'single',
  limit = 0,
  fuzzy = true,
  reverse = false,
  selectIfOne = false,
  height = 10,
  onSelect,
  onAbort,
  scopeId,
  keyboardEnabled = true
}: FilterProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `filter:${reactScopeId}`
  const [query, setQuery] = useState('')
  const [cursorIndex, setCursorIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ['label'],
        includeMatches: true,
        threshold: 0.3,
        ignoreLocation: true
      }),
    [options]
  )

  const filtered: FilterResult[] = useMemo(() => {
    if (!query) {
      return options.map((item, index) => ({
        item,
        matches: [] as FuseResultMatch[],
        refIndex: index
      }))
    }
    if (fuzzy) {
      return fuse.search(query).map((result) => ({
        item: result.item,
        matches: result.matches ?? [],
        refIndex: result.refIndex
      }))
    }
    return options
      .map((item, index) => ({ item, refIndex: index }))
      .filter(({ item }) => item.label.toLowerCase().includes(query.toLowerCase()))
  }, [options, query, fuzzy, fuse])

  const orderedFiltered = useMemo(() => {
    if (reverse) return [...filtered].reverse()
    return filtered
  }, [filtered, reverse])

  // Bound cursor when filtered list changes
  useEffect(() => {
    setCursorIndex((prev) => {
      if (orderedFiltered.length === 0) return 0
      return Math.min(prev, orderedFiltered.length - 1)
    })
  }, [orderedFiltered.length])

  // Auto-select if only one match
  useEffect(() => {
    if (selectIfOne && orderedFiltered.length === 1 && query.length > 0) {
      onSelect?.([orderedFiltered[0]!.item])
    }
  }, [selectIfOne, orderedFiltered, query, onSelect])

  useScopedKeyboard(
    keyboardScopeId,
    (key: KeyEvent) => {
      if (filterKeymap.match('abort', key)) {
        onAbort?.()
        return true
      }

      if (filterKeymap.match('submit', key)) {
        if (mode === 'multiple') {
          const selected = Array.from(selectedIndices)
            .map((refIndex) => options[refIndex])
            .filter((opt): opt is FilterOption => opt !== undefined)
          onSelect?.(selected)
        } else {
          const result = orderedFiltered[cursorIndex]
          if (result) {
            onSelect?.([result.item])
          }
        }
        return true
      }

      if (filterKeymap.match('up', key)) {
        setCursorIndex((prev) => {
          if (orderedFiltered.length === 0) return 0
          return (prev - 1 + orderedFiltered.length) % orderedFiltered.length
        })
        return true
      }

      if (filterKeymap.match('down', key)) {
        setCursorIndex((prev) => {
          if (orderedFiltered.length === 0) return 0
          return (prev + 1) % orderedFiltered.length
        })
        return true
      }

      if (filterKeymap.match('toggle', key) && mode === 'multiple') {
        const result = orderedFiltered[cursorIndex]
        if (!result) return false
        setSelectedIndices((prev) => {
          const next = new Set(prev)
          if (next.has(result.refIndex)) {
            next.delete(result.refIndex)
          } else {
            if (limit > 0 && next.size >= limit) return prev
            next.add(result.refIndex)
          }
          return next
        })
        return true
      }

      if (filterKeymap.match('selectAll', key) && mode === 'multiple') {
        setSelectedIndices((prev) => {
          if (prev.size === orderedFiltered.length) {
            return new Set()
          }
          const allIndices = orderedFiltered.map((r) => r.refIndex)
          if (limit > 0) {
            return new Set(allIndices.slice(0, limit))
          }
          return new Set(allIndices)
        })
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  // Pagination
  const pageOffset = Math.max(0, Math.min(cursorIndex - Math.floor(height / 2), orderedFiltered.length - height))
  const visibleStart = Math.max(0, pageOffset)
  const visibleResults = orderedFiltered.slice(visibleStart, visibleStart + height)

  return (
    <box style={{ flexDirection: 'column', gap: 0 }}>
      {/* Search input */}
      <box style={{ flexDirection: 'row' }}>
        <text content={prompt} fg={tokens.accent} />
        <input
          value={query}
          placeholder={placeholder}
          onInput={setQuery}
          focused={keyboardEnabled}
          style={{ focusedBackgroundColor: tokens.backgroundMuted }}
        />
      </box>

      {/* Filtered results */}
      <box style={{ flexDirection: 'column' }}>
        {visibleResults.map((result, visIndex) => {
          const absoluteIndex = visIndex + visibleStart
          const isCursor = absoluteIndex === cursorIndex
          const isSelected = selectedIndices.has(result.refIndex)
          const prefix = isCursor ? '> ' : '  '
          const marker = mode === 'multiple' ? (isSelected ? '[x] ' : '[ ] ') : ''
          const desc = result.item.description ? ` - ${result.item.description}` : ''

          return (
            <text
              key={result.item.value}
              content={`${prefix}${marker}${result.item.label}${desc}`}
              fg={isCursor ? tokens.accent : tokens.textPrimary}
            />
          )
        })}
      </box>

      {/* Count indicator */}
      <text content={`${filtered.length}/${options.length}`} fg={tokens.textMuted} />
    </box>
  )
}
