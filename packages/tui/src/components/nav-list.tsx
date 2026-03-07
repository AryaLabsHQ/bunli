import { useEffect, useId, useMemo, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { createKeyMatcher, displayWidth, formatFixedWidth, useScopedKeyboard, useTuiTheme } from '@bunli/runtime/app'
import type { TextOverflowMode } from '@bunli/runtime/app'

export interface NavListItem {
  key: string
  label: string
  description?: string
  section?: string
  meta?: string
  disabled?: boolean
}

export interface NavListProps {
  id?: string
  title?: string
  items: NavListItem[]
  value?: string
  defaultValue?: string
  onChange?: (key: string) => void
  onSelect?: (key: string) => void
  onFocusRequest?: () => void
  scopeId?: string
  keyboardEnabled?: boolean
  pointerEnabled?: boolean
  selectOnMove?: boolean
  maxLineWidth?: number
  overflow?: TextOverflowMode
  boxed?: boolean
  compact?: boolean
  wrapLabels?: boolean
  maxLabelLines?: number
}

const navKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  select: ['enter']
})

export function moveSelectableNavIndex(items: NavListItem[], currentIndex: number, delta: number) {
  if (items.length === 0) return -1

  for (let step = 0; step < items.length; step += 1) {
    const nextIndex = (currentIndex + delta * (step + 1) + items.length) % items.length
    if (!items[nextIndex]?.disabled) {
      return nextIndex
    }
  }

  return currentIndex
}

export function findFirstSelectableKey(items: NavListItem[]) {
  return items.find((item) => !item.disabled)?.key ?? items[0]?.key ?? ''
}

export function resolveNavListModeWidth(maxLineWidth: number | undefined) {
  const terminalWidth = process.stdout.columns ?? 80
  return Math.max(18, maxLineWidth ?? (terminalWidth - 4))
}

function chunkWord(word: string, maxWidth: number): string[] {
  if (maxWidth <= 1 || displayWidth(word) <= maxWidth) {
    return [word]
  }

  const chunks: string[] = []
  let current = ''

  for (const char of word) {
    const next = `${current}${char}`
    if (current.length > 0 && displayWidth(next) > maxWidth) {
      chunks.push(current)
      current = char
      continue
    }
    current = next
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
}

function wrapNavLabelLines(
  label: string,
  lineWidth: number,
  prefix: string,
  maxLines: number,
  overflow: TextOverflowMode
): string[] {
  if (maxLines <= 1) {
    return [formatFixedWidth(`${prefix}${label}`, lineWidth, { overflow })]
  }

  const restPrefix = '\u00a0\u00a0'
  const firstWidth = Math.max(1, lineWidth - displayWidth(prefix))
  const restWidth = Math.max(1, lineWidth - displayWidth(restPrefix))
  const rawWords = label.trim().split(/\s+/).filter(Boolean)
  const words = rawWords.flatMap((word) => chunkWord(word, Math.max(firstWidth, restWidth)))

  if (words.length === 0) {
    return [formatFixedWidth(prefix, lineWidth, { overflow: 'clip' })]
  }

  const lines: string[] = []
  let current = ''
  let currentWidth = firstWidth

  for (const [wordIndex, word] of words.entries()) {
    const candidate = current.length > 0 ? `${current} ${word}` : word
    if (current.length > 0 && displayWidth(candidate) > currentWidth) {
      lines.push(current)
      if (lines.length === maxLines - 1) {
        const remaining = [word, ...words.slice(wordIndex + 1)].join(' ')
        lines.push(remaining)
        return lines.map((line, index) =>
          formatFixedWidth(`${index === 0 ? prefix : restPrefix}${line}`, lineWidth, { overflow })
        )
      }
      current = word
      currentWidth = restWidth
      continue
    }
    current = candidate
  }

  if (current.length > 0) {
    lines.push(current)
  }

  return lines.slice(0, maxLines).map((line, index) =>
    formatFixedWidth(`${index === 0 ? prefix : restPrefix}${line}`, lineWidth, { overflow })
  )
}

export function NavList({
  id,
  title,
  items,
  value,
  defaultValue,
  onChange,
  onSelect,
  onFocusRequest,
  scopeId,
  keyboardEnabled = true,
  pointerEnabled = true,
  selectOnMove = true,
  maxLineWidth,
  overflow = 'ellipsis',
  boxed = false,
  compact = false,
  wrapLabels = false,
  maxLabelLines = 2
}: NavListProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `nav-list:${reactScopeId}`
  const [internalValue, setInternalValue] = useState(() => defaultValue ?? findFirstSelectableKey(items))
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const currentValue = value ?? internalValue

  useEffect(() => {
    if (items.length === 0) {
      if (value === undefined) {
        setInternalValue('')
      }
      return
    }

    const match = items.find((item) => item.key === currentValue && !item.disabled)
    if (match) return

    if (value === undefined) {
      setInternalValue(findFirstSelectableKey(items))
    }
  }, [currentValue, items, value])

  const selectedIndex = useMemo(() => {
    const matchedIndex = items.findIndex((item) => item.key === currentValue)
    if (matchedIndex >= 0) return matchedIndex
    return Math.max(0, items.findIndex((item) => !item.disabled))
  }, [currentValue, items])

  const lineWidth = useMemo(() => resolveNavListModeWidth(maxLineWidth), [maxLineWidth])

  const selectKey = (nextKey: string, options: { confirm?: boolean } = {}) => {
    if (!nextKey) return
    const item = items.find((candidate) => candidate.key === nextKey)
    if (!item || item.disabled) return

    if (value === undefined) {
      setInternalValue(nextKey)
    }

    onChange?.(nextKey)
    if (options.confirm) {
      onSelect?.(nextKey)
    }
  }

  useScopedKeyboard(
    keyboardScopeId,
    (key: KeyEvent) => {
      if (items.length === 0) return false

      if (navKeymap.match('up', key)) {
        const nextIndex = moveSelectableNavIndex(items, selectedIndex, -1)
        const nextKey = items[nextIndex]?.key
        if (nextKey) {
          if (selectOnMove) {
            selectKey(nextKey)
          } else if (value === undefined) {
            setInternalValue(nextKey)
          }
        }
        return true
      }

      if (navKeymap.match('down', key)) {
        const nextIndex = moveSelectableNavIndex(items, selectedIndex, 1)
        const nextKey = items[nextIndex]?.key
        if (nextKey) {
          if (selectOnMove) {
            selectKey(nextKey)
          } else if (value === undefined) {
            setInternalValue(nextKey)
          }
        }
        return true
      }

      if (navKeymap.match('select', key)) {
        const selected = items[selectedIndex]
        if (!selected || selected.disabled) return false
        selectKey(selected.key, { confirm: true })
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  let previousSection: string | undefined

  const content = (
    <>
      {title ? <text content={formatFixedWidth(title, lineWidth, { overflow: 'clip' })} fg={tokens.textMuted} /> : null}
      {items.map((item) => {
        const selected = item.key === currentValue
        const hovered = item.key === hoveredKey
        const sectionLabel = item.section && item.section !== previousSection ? item.section : undefined
        previousSection = item.section

        const prefix = selected ? '>\u00a0' : '\u00a0\u00a0'
        const metaWidth = item.meta ? displayWidth(item.meta) + 1 : 0
        const labelWidth = Math.max(8, lineWidth - 2 - metaWidth)
        const labelLines = wrapLabels && !item.meta
          ? wrapNavLabelLines(item.label, labelWidth, prefix, maxLabelLines, overflow)
          : [formatFixedWidth(`${prefix}${item.label}`, labelWidth, { overflow })]

        return (
          <box key={item.key} style={{ flexDirection: 'column', gap: compact ? 0 : 1 }}>
            {sectionLabel ? <text content={sectionLabel} fg={tokens.textMuted} /> : null}
            <box
              id={id ? `${id}--row-${item.key}` : undefined}
              width='100%'
              paddingLeft={boxed ? 0 : 1}
              paddingRight={boxed ? 0 : 1}
              style={{
                flexDirection: 'column',
                gap: compact ? 0 : 1,
                backgroundColor: selected || hovered ? tokens.backgroundMuted : undefined
              }}
              onMouseDown={pointerEnabled ? () => {
                onFocusRequest?.()
                selectKey(item.key, { confirm: true })
              } : undefined}
              onMouseOver={pointerEnabled ? () => {
                setHoveredKey(item.key)
              } : undefined}
              onMouseOut={pointerEnabled ? () => {
                setHoveredKey((current) => current === item.key ? null : current)
              } : undefined}
            >
              <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <box style={{ flexDirection: 'column', flexGrow: 1 }}>
                  {labelLines.map((line, lineIndex) => (
                    <text
                      key={`${item.key}-label-${lineIndex}`}
                      content={line}
                      fg={item.disabled ? tokens.textMuted : selected ? tokens.accent : hovered ? tokens.textPrimary : tokens.textPrimary}
                    />
                  ))}
                </box>
                {item.meta
                  ? <text content={item.meta} fg={selected ? tokens.accent : tokens.textMuted} />
                  : null}
              </box>
              {!compact && item.description
                ? <text content={formatFixedWidth(item.description, Math.max(14, lineWidth - 2), { overflow })} fg={tokens.textMuted} />
                : null}
            </box>
          </box>
        )
      })}
    </>
  )

  if (!boxed) {
    return <box id={id} width='100%' style={{ flexDirection: 'column', gap: compact ? 0 : 1 }}>{content}</box>
  }

  return (
    <box
      id={id}
      width='100%'
      border
      padding={1}
      style={{
        flexDirection: 'column',
        gap: compact ? 0 : 1,
        borderColor: keyboardEnabled ? tokens.accent : tokens.border
      }}
    >
      {content}
    </box>
  )
}
