import { useMemo } from 'react'
import { useTuiTheme } from './theme.js'

export interface KeyValueItem {
  key: string
  value: string | number | boolean | null | undefined
}

export interface KeyValueListProps {
  items: KeyValueItem[]
  minKeyWidth?: number
}

function pad(value: string, width: number): string {
  if (value.length >= width) return value
  return `${value}${' '.repeat(width - value.length)}`
}

export function KeyValueList({ items, minKeyWidth = 12 }: KeyValueListProps) {
  const { tokens } = useTuiTheme()

  const keyWidth = useMemo(
    () => Math.max(minKeyWidth, ...items.map((item) => item.key.length), 0),
    [items, minKeyWidth]
  )

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      {items.map((item, index) => (
        <text
          key={`kv-${index}-${item.key}`}
          content={`${pad(item.key, keyWidth)} : ${String(item.value ?? '')}`}
          fg={tokens.textPrimary}
        />
      ))}
    </box>
  )
}
