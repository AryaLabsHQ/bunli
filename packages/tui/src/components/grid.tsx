import { Children } from 'react'
import type { ReactNode } from 'react'

export interface GridProps {
  children: ReactNode
  columns?: number
  gap?: number
}

export function Grid({ children, columns = 2, gap = 1 }: GridProps) {
  const items = Children.toArray(children)
  const normalizedColumns = Math.max(1, columns)
  const rows: ReactNode[][] = []

  for (let index = 0; index < items.length; index += normalizedColumns) {
    rows.push(items.slice(index, index + normalizedColumns))
  }

  return (
    <box style={{ flexDirection: 'column', gap }}>
      {rows.map((row, rowIndex) => (
        <box key={`grid-row-${rowIndex}`} style={{ flexDirection: 'row', gap }}>
          {row.map((item, itemIndex) => (
            <box key={`grid-item-${rowIndex}-${itemIndex}`}>
              {item}
            </box>
          ))}
        </box>
      ))}
    </box>
  )
}
