/**
 * Table component for displaying tabular data
 */

import React from 'react'
import { Box, Text, Row, Column } from '../reconciler/components.js'
import type { BoxProps } from '../reconciler/terminal-element.js'

export interface TableColumn<T = any> {
  key: string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, item: T) => React.ReactNode
}

export interface TableProps<T extends Record<string, any> = Record<string, any>> extends Omit<BoxProps, 'children'> {
  /**
   * Table columns
   */
  columns: TableColumn<T>[]
  /**
   * Table data
   */
  data: T[]
  /**
   * Show header
   */
  showHeader?: boolean
  /**
   * Border style
   */
  borderStyle?: 'none' | 'single' | 'double' | 'ascii'
  /**
   * Compact mode (no padding)
   */
  compact?: boolean
  /**
   * Highlight row on focus
   */
  focusedIndex?: number
  /**
   * Empty state message
   */
  emptyMessage?: string
}

const borderChars = {
  single: {
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    cross: '┼',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤',
  },
  double: {
    horizontal: '═',
    vertical: '║',
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    cross: '╬',
    topJoin: '╦',
    bottomJoin: '╩',
    leftJoin: '╠',
    rightJoin: '╣',
  },
  ascii: {
    horizontal: '-',
    vertical: '|',
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    cross: '+',
    topJoin: '+',
    bottomJoin: '+',
    leftJoin: '+',
    rightJoin: '+',
  },
}

export function Table<T extends Record<string, any> = Record<string, any>>({
  columns,
  data,
  showHeader = true,
  borderStyle = 'single',
  compact = false,
  focusedIndex,
  emptyMessage = 'No data',
  style,
  ...props
}: TableProps<T>) {
  // Handle empty state
  if (data.length === 0) {
    return (
      <Box style={{ ...style, dim: true }} {...props}>
        <Text>{emptyMessage}</Text>
      </Box>
    )
  }
  
  const border = borderStyle !== 'none' ? borderChars[borderStyle] : null
  const padding = compact ? 0 : 1
  
  // Calculate column widths
  const columnWidths = columns.map(col => {
    if (col.width) return col.width
    
    // Auto-calculate based on content
    const headerWidth = col.header.length
    const maxDataWidth = Math.max(
      ...data.map(row => {
        const value = String(row[col.key] || '')
        return value.length
      })
    )
    
    return Math.max(headerWidth, maxDataWidth) + (padding * 2)
  })
  
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 
    (border ? columns.length + 1 : 0)
  
  // Render table rows
  const renderRow = (cells: React.ReactNode[], rowIndex?: number) => {
    const isFocused = rowIndex !== undefined && rowIndex === focusedIndex
    
    return (
      <Row gap={0}>
        {cells.map((cell, i) => (
          <Box
            key={i}
            width={columnWidths[i]}
            padding={[0, padding]}
            style={{
              backgroundColor: isFocused ? 'blue' : undefined,
              inverse: isFocused,
            }}
          >
            {cell}
          </Box>
        ))}
      </Row>
    )
  }
  
  // Render border row
  const renderBorderRow = (type: 'top' | 'middle' | 'bottom') => {
    if (!border) return null
    
    const left = border[`${type}Left` as keyof typeof border] || border.leftJoin
    const right = border[`${type}Right` as keyof typeof border] || border.rightJoin
    const join = border[`${type}Join` as keyof typeof border] || border.cross
    
    return (
      <Text>
        {left}
        {columnWidths.map((width, i) => 
          border.horizontal.repeat(width) +
          (i < columnWidths.length - 1 ? join : '')
        ).join('')}
        {right}
      </Text>
    )
  }
  
  return (
    <Box style={style} {...props}>
      <Column gap={0}>
        {border && renderBorderRow('top')}
        
        {showHeader && (
          <>
            {renderRow(columns.map(col => (
              <Text style={{ bold: true, align: col.align }}>
                {col.header}
              </Text>
            )))}
            {border && renderBorderRow('middle')}
          </>
        )}
        
        {data.map((row, index) => (
          <React.Fragment key={index}>
            {renderRow(
              columns.map(col => {
                const value = row[col.key]
                if (col.render) {
                  return col.render(value, row)
                }
                return (
                  <Text style={{ align: col.align }}>
                    {String(value || '')}
                  </Text>
                )
              }),
              index
            )}
          </React.Fragment>
        ))}
        
        {border && renderBorderRow('bottom')}
      </Column>
    </Box>
  )
}