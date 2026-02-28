import { useId, useState } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

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
  keyboardEnabled = true
}: MenuProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `menu:${reactScopeId}`
  const [index, setIndex] = useState(initialIndex)

  const move = (delta: number) => {
    if (items.length === 0) return

    for (let step = 0; step < items.length; step += 1) {
      const next = (index + delta * (step + 1) + items.length) % items.length
      if (!items[next]?.disabled) {
        setIndex(next)
        return
      }
    }
  }

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
        return (
          <text
            key={item.key}
            content={`${prefix} ${item.label}${disabled}${item.description ? ` - ${item.description}` : ''}`}
            fg={item.disabled ? tokens.textMuted : active ? tokens.accent : tokens.textPrimary}
          />
        )
      })}
    </box>
  )
}
