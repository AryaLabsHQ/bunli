import { useMemo } from 'react'
import { useTuiTheme } from './theme.js'
import { displayWidth, formatFixedWidth, type TextOverflowMode } from './text-layout.js'

export interface KeyValueItem {
  key: string
  value: string | number | boolean | null | undefined
}

export interface KeyValueListProps {
  items: KeyValueItem[]
  minKeyWidth?: number
  maxLineWidth?: number
  fillWidth?: boolean
  overflow?: TextOverflowMode
}

export function KeyValueList({
  items,
  minKeyWidth = 12,
  maxLineWidth,
  fillWidth = false,
  overflow = 'ellipsis'
}: KeyValueListProps) {
  const { tokens } = useTuiTheme()

  const keyWidth = useMemo(
    () => Math.max(minKeyWidth, ...items.map((item) => displayWidth(item.key)), 0),
    [items, minKeyWidth]
  )
  const lineWidth = useMemo(() => {
    const contentLineWidth = Math.max(
      keyWidth + 3,
      ...items.map((item) => displayWidth(`${formatFixedWidth(item.key, keyWidth)} : ${String(item.value ?? '')}`))
    )
    const boundedLineWidth = typeof maxLineWidth === 'number'
      ? Math.max(keyWidth + 3, Math.min(maxLineWidth, contentLineWidth))
      : contentLineWidth

    if (!fillWidth || typeof maxLineWidth !== 'number') {
      return boundedLineWidth
    }

    return Math.max(boundedLineWidth, maxLineWidth)
  }, [fillWidth, items, keyWidth, maxLineWidth])

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      {items.map((item, index) => (
        <text
          key={`kv-${index}-${item.key}`}
          content={formatFixedWidth(
            `${formatFixedWidth(item.key, keyWidth)} : ${String(item.value ?? '')}`,
            lineWidth,
            { overflow }
          )}
          fg={tokens.textPrimary}
        />
      ))}
    </box>
  )
}
