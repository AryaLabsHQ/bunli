import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'
import { displayWidth, formatFixedWidth, type TextOverflowMode } from './text-layout.js'

export interface MenuItem {
  key: string
  label: string
  description?: string
  disabled?: boolean
}

export interface MenuProps {
  title?: string
  items: MenuItem[]
  onSelect?: (key: string) => void
  initialIndex?: number
  scopeId?: string
  keyboardEnabled?: boolean
  maxLineWidth?: number
  overflow?: TextOverflowMode
  boxed?: boolean
  onKeyPress?: (key: KeyEvent, context: {
    index: number
    items: MenuItem[]
    setIndex: (nextIndex: number) => void
    select: (itemKey: string) => void
  }) => boolean
}

const menuKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  select: ['enter']
})

function isUpKey(key: KeyEvent) {
  const name = key.name?.toLowerCase()
  return menuKeymap.match('up', key) || name === 'arrowup' || key.sequence === '\u001b[A'
}

function isDownKey(key: KeyEvent) {
  const name = key.name?.toLowerCase()
  return menuKeymap.match('down', key) || name === 'arrowdown' || key.sequence === '\u001b[B'
}

function isSelectKey(key: KeyEvent) {
  const name = key.name?.toLowerCase()
  return (
    menuKeymap.match('select', key) ||
    name === 'return' ||
    key.sequence === '\r' ||
    key.sequence === '\n'
  )
}

export function Menu({
  title,
  items,
  onSelect,
  initialIndex = 0,
  scopeId,
  keyboardEnabled = true,
  maxLineWidth,
  overflow = 'ellipsis',
  boxed = true,
  onKeyPress
}: MenuProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `menu:${reactScopeId}`
  const [index, setIndex] = useState(initialIndex)
  const lineWidth = useMemo(() => {
    const contentLineWidth = Math.max(
      8,
      ...items.map((entry) => {
        const entryDisabled = entry.disabled ? ' [disabled]' : ''
        return displayWidth(`> ${entry.label}${entryDisabled}${entry.description ? ` - ${entry.description}` : ''}`)
      })
    )

    if (typeof maxLineWidth === 'number') {
      return Math.max(8, Math.min(maxLineWidth, contentLineWidth))
    }

    return contentLineWidth
  }, [items, maxLineWidth])
  const clearLineWidth = useMemo(() => {
    if (boxed) return lineWidth
    const terminalWidth = process.stdout.columns ?? 80
    return Math.max(lineWidth, terminalWidth - 2)
  }, [boxed, lineWidth])

  useEffect(() => {
    setIndex((prev) => {
      if (items.length === 0) return 0

      const bounded = ((prev % items.length) + items.length) % items.length
      if (!items[bounded]?.disabled) {
        return bounded
      }

      for (let offset = 1; offset < items.length; offset += 1) {
        const next = (bounded + offset) % items.length
        if (!items[next]?.disabled) {
          return next
        }
      }
      return bounded
    })
  }, [items])

  const move = useCallback((delta: number) => {
    if (items.length === 0) return

    setIndex((prev) => {
      for (let step = 0; step < items.length; step += 1) {
        const next = (prev + delta * (step + 1) + items.length) % items.length
        if (!items[next]?.disabled) {
          return next
        }
      }

      return prev
    })
  }, [items])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (
        onKeyPress?.(key, {
          index,
          items,
          setIndex: (nextIndex) => setIndex(nextIndex),
          select: (itemKey) => onSelect?.(itemKey)
        })
      ) {
        return true
      }

      if (isUpKey(key)) {
        move(-1)
        return true
      }

      if (isDownKey(key)) {
        move(1)
        return true
      }

      if (isSelectKey(key)) {
        const item = items[index]
        if (!item || item.disabled) return false
        onSelect?.(item.key)
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  const rows = (
    <>
      {title
        ? <text content={formatFixedWidth(title, clearLineWidth, { overflow: 'clip' })} fg={tokens.textPrimary} />
        : null}
      {items.map((item, itemIndex) => {
        const active = itemIndex === index
        const prefix = active ? '>' : ' '
        const disabled = item.disabled ? ' [disabled]' : ''
        const rawLine = `${prefix} ${item.label}${disabled}${item.description ? ` - ${item.description}` : ''}`

        return (
          <text
            key={item.key}
            content={formatFixedWidth(rawLine, clearLineWidth, { overflow })}
            fg={item.disabled ? tokens.textMuted : active ? tokens.accent : tokens.textPrimary}
          />
        )
      })}
    </>
  )

  if (!boxed) {
    return <box style={{ flexDirection: 'column', gap: 0 }}>{rows}</box>
  }

  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      {rows}
    </box>
  )
}
