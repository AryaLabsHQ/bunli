/**
 * Layout commit phase - assigns positions based on measurements
 */

import type { 
  TerminalContainer,
  TerminalElement,
  TerminalText,
  BoxProps,
  markRegionDirty,
} from './terminal-element.js'
import { 
  measureElement, 
  incrementMeasureVersion,
  type LayoutConstraints,
} from './measure.js'
import { normalizeSpacing } from '../types.js'
import { now } from '../utils/performance.js'
import { performanceTracker } from '../utils/performance-tracker.js'
import { 
  parseGridTemplate,
  calculateGridDimensions,
  autoPlaceGridItems,
  calculateTrackSizes,
  alignInCell,
  type GridCell,
} from './grid-layout.js'

/**
 * Perform layout calculation for the entire container
 */
export function commitLayout(container: TerminalContainer): void {
  if (!container.root) return
  
  const layoutStartTime = now()
  
  // Increment global measure version for this layout pass
  incrementMeasureVersion()
  
  // Create root constraints
  const constraints: LayoutConstraints = {
    minWidth: 0,
    maxWidth: container.width,
    minHeight: 0,
    maxHeight: container.height,
  }
  
  // Measure root
  const rootSize = measureElement(container.root, constraints)
  
  // Commit layout positions
  commitElementLayout(
    container.root,
    0, // x
    0, // y
    Math.min(rootSize.width, container.width),
    Math.min(rootSize.height, container.height)
  )
  
  // Record layout time
  const layoutTime = now() - layoutStartTime
  const currentMetrics = performanceTracker.getSummary()
  performanceTracker.endFrame({
    layoutTime,
    commitTime: layoutTime,
  })
}

/**
 * Commit layout position for an element and its children
 */
function commitElementLayout(
  element: TerminalElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Store previous layout for dirty tracking
  element.previousLayout = element.layout
  
  // Set new layout
  element.layout = { x, y, width, height }
  
  // Mark region dirty if layout changed
  if (
    !element.previousLayout ||
    element.previousLayout.x !== x ||
    element.previousLayout.y !== y ||
    element.previousLayout.width !== width ||
    element.previousLayout.height !== height
  ) {
    const container = findContainer(element)
    if (container) {
      const { markRegionDirty } = require('./terminal-element.js')
      
      // Mark old position as dirty if exists
      if (element.previousLayout) {
        markRegionDirty(container, element.previousLayout, 10)
      }
      
      // Mark new position as dirty
      markRegionDirty(container, element.layout, 10)
    }
  }
  
  // Layout children based on element type
  const props = element.props as BoxProps
  const [pTop, pRight, pBottom, pLeft] = normalizeSpacing(props.padding)
  
  // Account for border
  const borderOffset = (props.style as any)?.border && (props.style as any).border !== 'none' ? 1 : 0
  
  // Content area
  const contentX = x + pLeft + borderOffset
  const contentY = y + pTop + borderOffset
  const contentWidth = Math.max(0, width - pLeft - pRight - borderOffset * 2)
  const contentHeight = Math.max(0, height - pTop - pBottom - borderOffset * 2)
  
  // Check if this is a grid container
  const style = props.style as any
  if (style?.display === 'grid' || props.display === 'grid') {
    layoutGridChildren(
      element,
      contentX,
      contentY,
      contentWidth,
      contentHeight,
      style
    )
  } else {
    switch (element.elementType) {
      case 'box':
      case 'row':
      case 'column':
        const direction = props.direction || 
          (element.elementType === 'row' ? 'horizontal' : 'vertical')
        layoutFlexChildren(
          element,
          contentX,
          contentY,
          contentWidth,
          contentHeight,
          direction,
          props.gap || 0,
          props.justify,
          props.align
        )
        break
        
      case 'text':
        // Layout text element's text node children at (0,0) relative to text element
        for (const child of element.children) {
          if ('text' in child) {
            child.layout = {
              x: 0,
              y: 0,
              width: contentWidth,
              height: contentHeight,
            }
          }
        }
        break
        
      default:
        // Default to vertical layout
        layoutFlexChildren(
          element,
          contentX,
          contentY,
          contentWidth,
          contentHeight,
          'vertical',
          0
        )
    }
  }
}

/**
 * Layout flex children
 */
function layoutFlexChildren(
  element: TerminalElement,
  x: number,
  y: number,
  width: number,
  height: number,
  direction: 'horizontal' | 'vertical',
  gap: number,
  justify?: string,
  align?: string
): void {
  const children = element.children.filter(child => {
    // Skip text nodes - they should only be children of text elements
    if ('text' in child) return false
    return true
  })
  
  if (children.length === 0) return
  
  // Measure all children
  const childSizes: Array<{ 
    width: number; 
    height: number; 
    flex?: number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number;
  }> = []
  let totalFlexGrow = 0
  let totalFlexShrink = 0
  let totalMainSize = 0
  
  for (const child of children) {
    // Skip text nodes - already filtered
    if ('text' in child) continue
    
    // Measure element child
    const childProps = child.props as BoxProps
    const flex = childProps.flex || 0
    const flexGrow = childProps.flexGrow ?? flex // Use flex as default for flexGrow
    const flexShrink = childProps.flexShrink ?? 1 // Default shrink is 1
    const flexBasis = childProps.flexBasis
    
    // Determine basis size
    let basisSize = 0
    if (flexBasis !== undefined) {
      basisSize = typeof flexBasis === 'number' ? flexBasis : 0
    } else {
      // Measure natural size as basis
      const constraints: LayoutConstraints = {
        minWidth: 0,
        maxWidth: direction === 'horizontal' ? Infinity : width,
        minHeight: 0,
        maxHeight: direction === 'vertical' ? Infinity : height,
      }
      const naturalSize = measureElement(child, constraints)
      basisSize = direction === 'horizontal' ? naturalSize.width : naturalSize.height
    }
    
    const size = measureElement(child, {
      minWidth: 0,
      maxWidth: direction === 'horizontal' && flexGrow > 0 ? Infinity : width,
      minHeight: 0,
      maxHeight: direction === 'vertical' && flexGrow > 0 ? Infinity : height,
    })
    
    childSizes.push({ 
      ...size, 
      flex, 
      flexGrow,
      flexShrink,
      flexBasis: basisSize
    })
    
    if (flexGrow > 0) {
      totalFlexGrow += flexGrow
    }
    if (flexShrink > 0) {
      totalFlexShrink += flexShrink * basisSize // Weight by basis
    }
    
    // Use basis size for initial calculation
    if (direction === 'horizontal') {
      totalMainSize += basisSize
    } else {
      totalMainSize += basisSize
    }
  }
  
  // Add gaps
  totalMainSize += gap * (children.length - 1)
  
  // Calculate flex space
  const mainSize = direction === 'horizontal' ? width : height
  const availableSpace = mainSize - totalMainSize
  
  // Distribute space based on grow/shrink
  let spacePerItem: number[] = new Array(children.length).fill(0)
  
  if (availableSpace > 0 && totalFlexGrow > 0) {
    // Distribute positive space using flex-grow
    const growUnit = availableSpace / totalFlexGrow
    for (let i = 0; i < children.length; i++) {
      const size = childSizes[i]
      if (size && size.flexGrow && size.flexGrow > 0) {
        spacePerItem[i] = size.flexGrow * growUnit
      }
    }
  } else if (availableSpace < 0 && totalFlexShrink > 0) {
    // Distribute negative space using flex-shrink
    const shrinkRatio = Math.abs(availableSpace) / totalFlexShrink
    for (let i = 0; i < children.length; i++) {
      const size = childSizes[i]
      if (size && size.flexShrink && size.flexShrink > 0) {
        const basis = size.flexBasis || 0
        spacePerItem[i] = -(size.flexShrink * basis * shrinkRatio)
      }
    }
  }
  
  // Position children
  let mainPos = direction === 'horizontal' ? x : y
  
  
  // Apply justification
  if (justify && totalFlexGrow === 0 && availableSpace > 0) {
    const extraSpace = availableSpace
    switch (justify) {
      case 'center':
        mainPos += extraSpace / 2
        break
      case 'end':
        mainPos += extraSpace
        break
      case 'around':
        mainPos += extraSpace / (children.length * 2)
        gap += extraSpace / children.length
        break
      case 'between':
        if (children.length > 1) {
          gap += extraSpace / (children.length - 1)
        }
        break
      case 'evenly':
        const evenSpace = extraSpace / (children.length + 1)
        mainPos += evenSpace
        gap += evenSpace
        break
    }
  }
  
  // Layout each child
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const size = childSizes[i]
    
    if (!child || !size || 'text' in child) continue
    
    // Get margin for positioning adjustment
    const childProps = child.props as BoxProps
    const [mTop, mRight, mBottom, mLeft] = normalizeSpacing(childProps.margin)
    
    let childWidth: number
    let childHeight: number
    let childX = x
    let childY = y
    
    if (direction === 'horizontal') {
      // Horizontal layout
      const baseWidth = size.flexBasis !== undefined ? size.flexBasis : size.width
      // size.width already includes margins from measure phase
      childWidth = Math.max(0, baseWidth + (spacePerItem[i] || 0) - mLeft - mRight)
      childHeight = Math.min(size.height - mTop - mBottom, height)
      
      // Position child accounting for margin
      childX = mainPos + mLeft
      
      // Apply alignment
      if (align === 'center') {
        childY = y + Math.floor((height - childHeight) / 2)
      } else if (align === 'end') {
        childY = y + height - childHeight
      } else {
        childY = y + mTop
      }
      
      // Move position by actual rendered width (including flex space and margins)
      mainPos += childWidth + mLeft + mRight + gap
    } else {
      // Vertical layout
      childWidth = Math.min(size.width - mLeft - mRight, width)
      const baseHeight = size.flexBasis !== undefined ? size.flexBasis : size.height
      // size.height already includes margins from measure phase
      childHeight = Math.max(0, baseHeight + (spacePerItem[i] || 0) - mTop - mBottom)
      
      // Position child accounting for margin
      childY = mainPos + mTop
      
      // Apply alignment
      if (align === 'center') {
        childX = x + Math.floor((width - childWidth) / 2)
      } else if (align === 'end' || align === 'right') {
        childX = x + width - childWidth
      } else {
        childX = x + mLeft
      }
      
      // Move position by actual rendered height (including flex space and margins)
      mainPos += childHeight + mTop + mBottom + gap
    }
    
    // Commit child layout
    commitElementLayout(child, childX, childY, childWidth, childHeight)
  }
}

/**
 * Layout grid children
 */
function layoutGridChildren(
  element: TerminalElement,
  x: number,
  y: number,
  width: number,
  height: number,
  style: any
): void {
  const children = element.children.filter(child => {
    // Skip text nodes - they should only be children of text elements
    if ('text' in child) return false
    return true
  })
  
  if (children.length === 0) return
  
  // Parse grid templates
  const columnTemplate = style?.gridTemplateColumns || '1fr'
  const rowTemplate = style?.gridTemplateRows || '1fr'
  const [gapRow, gapCol] = Array.isArray(style?.gridGap) 
    ? style.gridGap 
    : [style?.gridGap || 0, style?.gridGap || 0]
  const autoFlow = style?.gridAutoFlow || 'row'
  
  const columnTracks = parseGridTemplate(columnTemplate)
  const rowTracks = parseGridTemplate(rowTemplate)
  
  // Calculate initial grid dimensions
  let { columns, rows } = calculateGridDimensions(children, autoFlow)
  
  // Use template dimensions as minimum
  columns = Math.max(columns, columnTracks.length)
  rows = Math.max(rows, rowTracks.length)
  
  
  // Ensure we have enough tracks
  while (columnTracks.length < columns) {
    columnTracks.push({ size: 0, isFixed: false, frValue: 1 })
  }
  while (rowTracks.length < rows) {
    rowTracks.push({ size: 0, isFixed: false, frValue: 1 })
  }
  
  // Auto-place grid items
  const placement = autoPlaceGridItems(children, columns, rows, autoFlow)
  const cells = placement.cells
  columns = placement.columns
  rows = placement.rows
  
  
  // Ensure we have enough tracks for the expanded grid
  while (columnTracks.length < columns) {
    columnTracks.push({ size: 0, isFixed: false, frValue: 1 })
  }
  while (rowTracks.length < rows) {
    rowTracks.push({ size: 0, isFixed: false, frValue: 1 })
  }
  
  // Calculate track sizes
  const constraints: LayoutConstraints = {
    minWidth: 0,
    maxWidth: width,
    minHeight: 0,
    maxHeight: height,
  }
  
  const columnSizes = calculateTrackSizes(
    columnTracks,
    cells,
    width,
    'width',
    gapCol,
    constraints
  )
  
  const rowSizes = calculateTrackSizes(
    rowTracks,
    cells,
    height,
    'height',
    gapRow,
    constraints
  )
  
  // Calculate cumulative positions
  const columnPositions = [0]
  for (let i = 0; i < columnSizes.length; i++) {
    columnPositions.push((columnPositions[i] || 0) + (columnSizes[i] || 0) + (i < columnSizes.length - 1 ? gapCol : 0))
  }
  
  const rowPositions = [0]
  for (let i = 0; i < rowSizes.length; i++) {
    rowPositions.push((rowPositions[i] || 0) + (rowSizes[i] || 0) + (i < rowSizes.length - 1 ? gapRow : 0))
  }
  
  // Position each cell
  for (const cell of cells) {
    // Ensure we have positions for this cell
    if (cell.column >= columnPositions.length - 1 || cell.row >= rowPositions.length - 1) {
      // Skip cells that are out of bounds
      continue
    }
    
    const cellX = x + (columnPositions[cell.column] || 0)
    const cellY = y + (rowPositions[cell.row] || 0)
    
    // Calculate cell dimensions
    let cellWidth = 0
    for (let i = 0; i < cell.columnSpan && cell.column + i < columnSizes.length; i++) {
      cellWidth += columnSizes[cell.column + i] || 0
      if (i > 0) cellWidth += gapCol
    }
    
    let cellHeight = 0
    for (let i = 0; i < cell.rowSpan && cell.row + i < rowSizes.length; i++) {
      cellHeight += rowSizes[cell.row + i] || 0
      if (i > 0) cellHeight += gapRow
    }
    
    // For all grid children, commit their layout
    if (cell.element && 'elementType' in cell.element) {
      // For now, just place the element in the cell without alignment calculations
      commitElementLayout(cell.element as TerminalElement, cellX, cellY, cellWidth, cellHeight)
    }
  }
}

/**
 * Find the root container for an element
 */
function findContainer(element: TerminalElement): TerminalContainer | null {
  let current: any = element
  
  while (current) {
    // Check if this is a container
    if (current.dirtyTracker && current.stream) {
      return current as TerminalContainer
    }
    
    // Check for container reference
    if (current._container) {
      return current._container
    }
    
    current = current.parent
  }
  
  return null
} 