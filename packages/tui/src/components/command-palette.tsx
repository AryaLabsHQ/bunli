import { useId, useMemo, useState } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

export interface CommandPaletteItem {
  key: string
  label: string
  hint?: string
}

export interface CommandPaletteProps {
  items: CommandPaletteItem[]
  placeholder?: string
  onSelect?: (key: string) => void
  scopeId?: string
  keyboardEnabled?: boolean
}

const paletteKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  select: ['enter']
})

export function CommandPalette({
  items,
  placeholder = 'Type to filter commands...',
  onSelect,
  scopeId,
  keyboardEnabled = true
}: CommandPaletteProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `command-palette:${reactScopeId}`
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(
    () =>
      items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  )

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (filtered.length === 0) return false

      if (paletteKeymap.match('up', key)) {
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
        return true
      }

      if (paletteKeymap.match('down', key)) {
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
        return true
      }

      if (paletteKeymap.match('select', key)) {
        const item = filtered[selectedIndex]
        if (!item) return false
        onSelect?.(item.key)
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      <input
        value={query}
        placeholder={placeholder}
        onInput={setQuery}
        focused
        style={{ focusedBackgroundColor: tokens.backgroundMuted }}
      />
      <box style={{ flexDirection: 'column', gap: 1 }}>
        {filtered.length === 0 ? (
          <text content="No commands found" fg={tokens.textMuted} />
        ) : (
          filtered.map((item, index) => (
            <text
              key={item.key}
              content={`${index === selectedIndex ? '>' : ' '} ${item.label}${item.hint ? ` - ${item.hint}` : ''}`}
              fg={index === selectedIndex ? tokens.accent : tokens.textPrimary}
            />
          ))
        )}
      </box>
    </box>
  )
}
