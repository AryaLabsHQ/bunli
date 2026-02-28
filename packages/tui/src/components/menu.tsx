import { useCallback, useEffect, useId, useState } from 'react'
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
}

const menuKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  select: ['enter']
})

export function Menu({
  title,
  items,
  onSelect,
  initialIndex = 0,
  scopeId,
  keyboardEnabled = true,
  maxLineWidth,
  overflow = 'ellipsis'
}: MenuProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `menu:${reactScopeId}`
  const [index, setIndex] = useState(initialIndex)
  const lineWidth = Math.max(
    8,
    Math.min(
      maxLineWidth ?? Number.POSITIVE_INFINITY,
      ...items.map((entry) => {
        const entryDisabled = entry.disabled ? ' [disabled]' : ''
        return displayWidth(`> ${entry.label}${entryDisabled}${entry.description ? ` - ${entry.description}` : ''}`)
      })
    )
  )

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
      if (menuKeymap.match('up', key)) {
        move(-1)
        return true
      }

      if (menuKeymap.match('down', key)) {
        move(1)
        return true
      }

      if (menuKeymap.match('select', key)) {
        const item = items[index]
        if (!item || item.disabled) return false
        onSelect?.(item.key)
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      {title ? <text content={title} fg={tokens.textPrimary} /> : null}
      {items.map((item, itemIndex) => {
        const active = itemIndex === index
        const prefix = active ? '>' : ' '
        const disabled = item.disabled ? ' [disabled]' : ''
        const rawLine = `${prefix} ${item.label}${disabled}${item.description ? ` - ${item.description}` : ''}`

        return (
            <text
              key={item.key}
              content={formatFixedWidth(rawLine, lineWidth, { overflow })}
              fg={item.disabled ? tokens.textMuted : active ? tokens.accent : tokens.textPrimary}
            />
        )
      })}
    </box>
  )
}
