/**
 * Grid layout implementation for terminal UI
 * Provides CSS Grid-like capabilities adapted for terminal constraints
 */

import type { 
  TerminalElement,
  TerminalNode,
  BoxProps,
} from './terminal-element.js'
import { isTextNode } from './terminal-element.js'
import { measureElement, type LayoutConstraints } from './measure.js'
import type { GridTemplate, GridAlign } from '../types.js'

export interface GridCell {
  element: TerminalNode
  column: number
  row: number
  columnSpan: number
  rowSpan: number
}

export interface GridTrack {
  size: number
  isFixed: boolean
  frValue?: number
}

/**
 * Parse grid template string into tracks
 * Supports: fixed numbers, 'auto', and 'fr' units
 * Examples: '100 1fr 2fr', 'auto 1fr auto'
 */
export function parseGridTemplate(template: GridTemplate): GridTrack[] {
  if (Array.isArray(template)) {
    return template.map(size => ({ size, isFixed: true }))
  }
  
  const parts = template.trim().split(/\s+/)
  return parts.map(part => {
    if (part === 'auto') {
      return { size: 0, isFixed: false }
    }
    
    const frMatch = part.match(/^(\d+(?:\.\d+)?)fr$/)
    if (frMatch) {
      return { size: 0, isFixed: false, frValue: parseFloat(frMatch[1]) }
    }
    
    const num = parseFloat(part)
    if (!isNaN(num)) {
      return { size: num, isFixed: true }
    }
    
    return { size: 0, isFixed: false } // Default to auto
  })
}

/**
 * Calculate grid dimensions based on children
 */
export function calculateGridDimensions(
  children: TerminalNode[],
  autoFlow: string = 'row'
): { columns: number; rows: number } {
  let maxColumn = 0
  let maxRow = 0
  
  for (const child of children) {
    if (isTextNode(child)) continue
    
    const props = child.props as BoxProps
    const style = props.style as any
    
    // Parse grid position
    const column = parseGridPosition(style?.gridColumn) || 1
    const row = parseGridPosition(style?.gridRow) || 1
    const columnSpan = style?.gridColumnSpan || parseGridSpan(style?.gridColumn)
    const rowSpan = style?.gridRowSpan || parseGridSpan(style?.gridRow)
    
    maxColumn = Math.max(maxColumn, column + columnSpan - 1)
    maxRow = Math.max(maxRow, row + rowSpan - 1)
  }
  
  // Ensure minimum dimensions
  return {
    columns: Math.max(1, maxColumn),
    rows: Math.max(1, maxRow),
  }
}

/**
 * Parse grid position from string or number
 * Supports: number (1-based), 'span 2', '1 / 3'
 */
function parseGridPosition(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  
  // Handle 'span X' format
  const spanMatch = value.match(/span\s+(\d+)/)
  if (spanMatch) return 0 // 0 means auto-placement
  
  // Handle 'start / end' format
  const rangeMatch = value.match(/^(\d+)\s*\//)
  if (rangeMatch) return parseInt(rangeMatch[1])
  
  // Try direct number
  const num = parseInt(value)
  return isNaN(num) ? 0 : num
}

/**
 * Parse span value from grid position string
 */
function parseGridSpan(value: string | number | undefined): number {
  if (!value || typeof value === 'number') return 1
  
  // Handle 'span X' format
  const spanMatch = value.toString().match(/span\s+(\d+)/)
  if (spanMatch) return parseInt(spanMatch[1])
  
  // Handle 'start / end' format  
  const rangeMatch = value.toString().match(/^(\d+)\s*\/\s*(\d+)/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1])
    const end = parseInt(rangeMatch[2])
    return end - start
  }
  
  return 1
}

/**
 * Auto-place items in grid according to auto-flow rules
 */
export function autoPlaceGridItems(
  children: TerminalNode[],
  initialColumns: number,
  initialRows: number,
  autoFlow: string = 'row'
): { cells: GridCell[]; columns: number; rows: number } {
  let columns = initialColumns
  let rows = initialRows
  const cells: GridCell[] = []
  const occupied = new Set<string>()
  
  
  // Helper to check if a cell range is occupied
  const isOccupied = (col: number, row: number, colSpan: number, rowSpan: number): boolean => {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (occupied.has(`${c},${r}`)) return true
      }
    }
    return false
  }
  
  // Helper to mark cells as occupied
  const markOccupied = (col: number, row: number, colSpan: number, rowSpan: number) => {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        occupied.add(`${c},${r}`)
      }
    }
  }
  
  // First pass: place explicitly positioned items
  for (const child of children) {
    if (isTextNode(child)) continue
    
    const props = child.props as BoxProps
    const style = props.style as any
    
    const explicitColumn = parseGridPosition(style?.gridColumn)
    const explicitRow = parseGridPosition(style?.gridRow)
    const columnSpan = style?.gridColumnSpan || parseGridSpan(style?.gridColumn)
    const rowSpan = style?.gridRowSpan || parseGridSpan(style?.gridRow)
    
    if (explicitColumn && explicitRow) {
      cells.push({
        element: child,
        column: explicitColumn - 1, // Convert to 0-based
        row: explicitRow - 1,
        columnSpan,
        rowSpan,
      })
      markOccupied(explicitColumn - 1, explicitRow - 1, columnSpan, rowSpan)
    }
  }
  
  // Second pass: auto-place remaining items
  let currentRow = 0
  let currentColumn = 0
  
  for (const child of children) {
    if (isTextNode(child)) continue
    
    const props = child.props as BoxProps
    const style = props.style as any
    
    const explicitColumn = parseGridPosition(style?.gridColumn)
    const explicitRow = parseGridPosition(style?.gridRow)
    
    // Skip if already placed
    if (explicitColumn && explicitRow) continue
    
    const columnSpan = style?.gridColumnSpan || parseGridSpan(style?.gridColumn)
    const rowSpan = style?.gridRowSpan || parseGridSpan(style?.gridRow)
    
    
    // Find next available position
    let placed = false
    while (!placed) {
      if (!isOccupied(currentColumn, currentRow, columnSpan, rowSpan) &&
          currentColumn + columnSpan <= columns &&
          currentRow + rowSpan <= rows) {
        cells.push({
          element: child,
          column: currentColumn,
          row: currentRow,
          columnSpan,
          rowSpan,
        })
        markOccupied(currentColumn, currentRow, columnSpan, rowSpan)
        placed = true
        
        // Move to next position after placing (column/row is already occupied)
        // For row flow, continue in same row if possible
        if (autoFlow === 'row' || autoFlow === 'row dense') {
          currentColumn += columnSpan
          // Note: we don't increment row here, that happens in the not-placed branch
        } else {
          currentRow += rowSpan  
          // Note: we don't increment column here, that happens in the not-placed branch
        }
      } else {
        // Move to next position to try again
        if (autoFlow === 'row' || autoFlow === 'row dense') {
          currentColumn++
          if (currentColumn >= columns) {
            currentColumn = 0
            currentRow++
          }
        } else {
          currentRow++
          if (currentRow >= rows) {
            currentRow = 0
            currentColumn++
          }
        }
      }
      
      // Expand grid if needed
      if (currentRow >= rows && autoFlow.includes('row')) {
        rows++
      }
      if (currentColumn >= columns && autoFlow.includes('column')) {
        columns++
      }
    }
    
    // For non-dense packing, don't go back to fill holes
    // (This is already handled by the placement logic above)
  }
  
  return { cells, columns, rows }
}

/**
 * Calculate track sizes based on content and constraints
 */
export function calculateTrackSizes(
  tracks: GridTrack[],
  cells: GridCell[],
  availableSize: number,
  dimension: 'width' | 'height',
  gap: number,
  constraints: LayoutConstraints
): number[] {
  const trackCount = tracks.length
  const totalGap = gap * (trackCount - 1)
  let availableForTracks = availableSize - totalGap
  
  // Initialize sizes
  const sizes = tracks.map(track => track.isFixed ? track.size : 0)
  
  // Calculate auto track sizes based on content
  for (let i = 0; i < trackCount; i++) {
    if (!tracks[i].isFixed && !tracks[i].frValue) {
      let maxSize = 0
      
      // Find all cells in this track
      for (const cell of cells) {
        const trackIndex = dimension === 'width' ? cell.column : cell.row
        const span = dimension === 'width' ? cell.columnSpan : cell.rowSpan
        
        if (trackIndex === i && span === 1) {
          // Measure element
          const elementConstraints: LayoutConstraints = {
            minWidth: 0,
            maxWidth: dimension === 'width' ? Infinity : constraints.maxWidth,
            minHeight: 0,
            maxHeight: dimension === 'height' ? Infinity : constraints.maxHeight,
          }
          
          const measured = measureElement(cell.element, elementConstraints)
          maxSize = Math.max(maxSize, dimension === 'width' ? measured.width : measured.height)
        }
      }
      
      sizes[i] = maxSize
    }
  }
  
  // Subtract fixed and auto sizes from available space
  const usedSpace = sizes.reduce((sum, size) => sum + size, 0)
  availableForTracks -= usedSpace
  
  // Distribute remaining space to fr tracks
  const totalFr = tracks.reduce((sum, track) => sum + (track.frValue || 0), 0)
  if (totalFr > 0 && availableForTracks > 0) {
    const frUnit = availableForTracks / totalFr
    
    for (let i = 0; i < trackCount; i++) {
      if (tracks[i].frValue) {
        sizes[i] = Math.floor(tracks[i].frValue! * frUnit)
      }
    }
  }
  
  return sizes
}

/**
 * Align item within grid cell
 */
export function alignInCell(
  itemSize: number,
  cellSize: number,
  cellStart: number,
  align: GridAlign = 'stretch'
): { position: number; size: number } {
  switch (align) {
    case 'start':
      return { position: cellStart, size: itemSize }
    case 'end':
      return { position: cellStart + cellSize - itemSize, size: itemSize }
    case 'center':
      return { position: cellStart + Math.floor((cellSize - itemSize) / 2), size: itemSize }
    case 'stretch':
    default:
      return { position: cellStart, size: cellSize }
  }
}