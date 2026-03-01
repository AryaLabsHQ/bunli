import { useEffect, useId, useMemo, useState } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'
import { displayWidth, formatFixedWidth, type TextOverflowMode } from './text-layout.js'

export interface DataTableColumn {
  key: string
  label: string
}

export interface DataTableProps {
  columns: DataTableColumn[]
  rows: Array<Record<string, string | number | boolean | null | undefined>>
  onRowSelect?: (row: Record<string, string | number | boolean | null | undefined>) => void
  scopeId?: string
  keyboardEnabled?: boolean
  maxLineWidth?: number
  fillWidth?: boolean
  overflow?: TextOverflowMode
}

const dataTableKeymap = createKeyMatcher({
  sortPrevious: ['left', 'h'],
  sortNext: ['right', 'l'],
  rowPrevious: ['up', 'k'],
  rowNext: ['down', 'j'],
  select: ['enter']
})

export function DataTable({
  columns,
  rows,
  onRowSelect,
  scopeId,
  keyboardEnabled = true,
  maxLineWidth,
  fillWidth = false,
  overflow = 'ellipsis'
}: DataTableProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `datatable:${reactScopeId}`
  const [sortIndex, setSortIndex] = useState(0)
  const [selectedRowIndex, setSelectedRowIndex] = useState(0)

  const sortColumn = columns[sortIndex]?.key

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows
    const copy = [...rows]
    copy.sort((a, b) => String(a[sortColumn] ?? '').localeCompare(String(b[sortColumn] ?? '')))
    return copy
  }, [rows, sortColumn])

  useEffect(() => {
    setSortIndex((prev) => {
      if (columns.length === 0) return 0
      return Math.min(prev, columns.length - 1)
    })
  }, [columns.length])

  useEffect(() => {
    setSelectedRowIndex((prev) => {
      if (sortedRows.length === 0) return 0
      return Math.min(prev, sortedRows.length - 1)
    })
  }, [sortedRows.length])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (dataTableKeymap.match('sortPrevious', key)) {
        if (columns.length === 0) return false
        setSortIndex((prev) => (prev - 1 + columns.length) % columns.length)
        return true
      }

      if (dataTableKeymap.match('sortNext', key)) {
        if (columns.length === 0) return false
        setSortIndex((prev) => (prev + 1) % columns.length)
        return true
      }

      if (dataTableKeymap.match('rowPrevious', key)) {
        if (sortedRows.length === 0) return false
        setSelectedRowIndex((prev) => Math.max(0, prev - 1))
        return true
      }

      if (dataTableKeymap.match('rowNext', key)) {
        if (sortedRows.length === 0) return false
        setSelectedRowIndex((prev) => Math.min(sortedRows.length - 1, prev + 1))
        return true
      }

      if (dataTableKeymap.match('select', key)) {
        const row = sortedRows[selectedRowIndex]
        if (!row) return false
        onRowSelect?.(row)
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  const widths = columns.map((column) =>
    Math.max(
      displayWidth(column.label),
      ...sortedRows.map((row) => displayWidth(String(row[column.key] ?? ''))),
      1
    )
  )

  const rawHeader = columns
    .map((column, index) => {
      const decorated = index === sortIndex ? `${column.label}*` : column.label
      return formatFixedWidth(decorated, widths[index] ?? displayWidth(column.label), { overflow })
    })
    .join(' | ')
  const rawSeparator = widths.map((width) => '-'.repeat(width)).join('-+-')
  const rawRowLines = sortedRows.map((row) => columns
    .map((column, index) => formatFixedWidth(String(row[column.key] ?? ''), widths[index] ?? 1, { overflow }))
    .join(' | '))
  const contentWidth = Math.max(
    displayWidth(rawHeader),
    displayWidth(rawSeparator),
    ...rawRowLines.map((line) => displayWidth(line)),
    1
  )
  const finalLineWidth = Math.max(
    8,
    fillWidth && typeof maxLineWidth === 'number'
      ? maxLineWidth
      : Math.min(maxLineWidth ?? Number.POSITIVE_INFINITY, contentWidth)
  )
  const header = formatFixedWidth(rawHeader, finalLineWidth, { overflow })
  const separator = formatFixedWidth(rawSeparator, finalLineWidth, { overflow })

  const footer = formatFixedWidth('Arrows: navigate/sort | Enter: select row', finalLineWidth, { overflow })

  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      <text content={header} fg={tokens.textPrimary} />
      <text content={separator} fg={tokens.borderMuted} />
      {sortedRows.length === 0 ? (
        <text content={formatFixedWidth('No rows', finalLineWidth, { overflow })} fg={tokens.textMuted} />
      ) : (
        sortedRows.map((row, rowIndex) => {
          const line = formatFixedWidth(rawRowLines[rowIndex] ?? '', finalLineWidth, { overflow })
          const active = rowIndex === selectedRowIndex
          return (
            <text
              key={`datatable-row-${rowIndex}`}
              content={formatFixedWidth(`${active ? '>' : ' '} ${line}`, finalLineWidth + 2, { overflow })}
              fg={active ? tokens.accent : tokens.textPrimary}
            />
          )
        })
      )}
      <text content={footer} fg={tokens.textMuted} />
    </box>
  )
}
