import { useId, useMemo, useState } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

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
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`
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
  keyboardEnabled = true
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

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (dataTableKeymap.match('sortPrevious', key)) {
        setSortIndex((prev) => (prev - 1 + columns.length) % Math.max(columns.length, 1))
        return true
      }

      if (dataTableKeymap.match('sortNext', key)) {
        setSortIndex((prev) => (prev + 1) % Math.max(columns.length, 1))
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
    Math.max(column.label.length, ...sortedRows.map((row) => String(row[column.key] ?? '').length), 1)
  )

  const header = columns
    .map((column, index) => {
      const decorated = index === sortIndex ? `${column.label}*` : column.label
      return pad(decorated, widths[index] ?? column.label.length)
    })
    .join(' | ')

  const separator = widths.map((width) => '-'.repeat(width)).join('-+-')

  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      <text content={header} fg={tokens.textPrimary} />
      <text content={separator} fg={tokens.borderMuted} />
      {sortedRows.length === 0 ? (
        <text content="No rows" fg={tokens.textMuted} />
      ) : (
        sortedRows.map((row, rowIndex) => {
          const line = columns
            .map((column, index) => pad(String(row[column.key] ?? ''), widths[index] ?? 1))
            .join(' | ')
          const active = rowIndex === selectedRowIndex
          return (
            <text
              key={`datatable-row-${rowIndex}`}
              content={`${active ? '>' : ' '} ${line}`}
              fg={active ? tokens.accent : tokens.textPrimary}
            />
          )
        })
      )}
      <text content="Arrows: navigate/sort | Enter: select row" fg={tokens.textMuted} />
    </box>
  )
}
