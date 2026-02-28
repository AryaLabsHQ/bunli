import { useEffect, useId, useMemo, useState } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'
import { displayWidth, formatFixedWidth, type TextOverflowMode } from './text-layout.js'

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
  inputFocused?: boolean
  maxLineWidth?: number
  overflow?: TextOverflowMode
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
  keyboardEnabled = true,
  inputFocused = true,
  maxLineWidth,
  overflow = 'ellipsis'
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

  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filtered.length === 0) return 0
      return Math.min(prev, filtered.length - 1)
    })
  }, [filtered.length])
  const lineWidth = useMemo(
    () =>
      Math.max(
        8,
        Math.min(
          maxLineWidth ?? Number.POSITIVE_INFINITY,
          ...items.map((item) => displayWidth(`> ${item.label}${item.hint ? ` - ${item.hint}` : ''}`))
        )
      ),
    [items, maxLineWidth]
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
        focused={inputFocused}
        style={{ focusedBackgroundColor: tokens.backgroundMuted }}
      />
      <box style={{ flexDirection: 'column', gap: 1 }}>
        {filtered.length === 0 ? (
          <text content="No commands found" fg={tokens.textMuted} />
        ) : (
          Array.from({ length: filtered.length }, (_, rowIndex) => {
            const item = filtered[rowIndex]
            if (!item) {
              return <text key={`palette-empty-${rowIndex}`} content={formatFixedWidth('', lineWidth, { overflow })} fg={tokens.textPrimary} />
            }

            const active = rowIndex === selectedIndex
            const rawLine = `${active ? '>' : ' '} ${item.label}${item.hint ? ` - ${item.hint}` : ''}`
            return (
                <text
                  key={item.key}
                  content={formatFixedWidth(rawLine, lineWidth, { overflow })}
                  fg={active ? tokens.accent : tokens.textPrimary}
                />
            )
          })
        )}
      </box>
    </box>
  )
}
