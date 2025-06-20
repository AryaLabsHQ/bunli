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

/**
 * Perform layout calculation for the entire container
 */
export function commitLayout(container: TerminalContainer): void {
  if (!container.root) return
  
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
      // Text layout is handled during rendering
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
    if ('text' in child && child.text.trim().length === 0) return false
    return true
  })
  
  if (children.length === 0) return
  
  // Measure all children
  const childSizes: Array<{ width: number; height: number; flex?: number }> = []
  let totalFlex = 0
  let totalMainSize = 0
  
  for (const child of children) {
    if ('text' in child) {
      // For text nodes, use simple measurement
      const lines = child.text.split('\n')
      const w = Math.max(...lines.map(l => l.length))
      const h = lines.length
      childSizes.push({ width: w, height: h })
      
      if (direction === 'horizontal') {
        totalMainSize += w
      } else {
        totalMainSize += h
      }
    } else {
      // Measure element child
      const childProps = child.props as BoxProps
      const flex = childProps.flex || 0
      
      const constraints: LayoutConstraints = {
        minWidth: 0,
        maxWidth: direction === 'horizontal' && flex > 0 ? Infinity : width,
        minHeight: 0,
        maxHeight: direction === 'vertical' && flex > 0 ? Infinity : height,
      }
      
      const size = measureElement(child, constraints)
      childSizes.push({ ...size, flex })
      
      if (flex > 0) {
        totalFlex += flex
      } else {
        if (direction === 'horizontal') {
          totalMainSize += size.width
        } else {
          totalMainSize += size.height
        }
      }
    }
  }
  
  // Add gaps
  totalMainSize += gap * (children.length - 1)
  
  // Calculate flex space
  const mainSize = direction === 'horizontal' ? width : height
  const remainingSpace = Math.max(0, mainSize - totalMainSize)
  const flexUnit = totalFlex > 0 ? remainingSpace / totalFlex : 0
  
  // Position children
  let mainPos = direction === 'horizontal' ? x : y
  
  // Apply justification
  if (justify && totalFlex === 0) {
    const extraSpace = mainSize - totalMainSize
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
    
    if (!child || !size) continue
    
    let childWidth: number
    let childHeight: number
    let childX = x
    let childY = y
    
    if (direction === 'horizontal') {
      // Horizontal layout
      childWidth = size.flex && size.flex > 0 
        ? Math.floor(size.flex * flexUnit)
        : size.width
      childHeight = Math.min(size.height, height)
      childX = mainPos
      
      // Apply alignment
      if (align === 'center') {
        childY = y + Math.floor((height - childHeight) / 2)
      } else if (align === 'end') {
        childY = y + height - childHeight
      }
      
      mainPos += childWidth + gap
    } else {
      // Vertical layout
      childWidth = Math.min(size.width, width)
      childHeight = size.flex && size.flex > 0
        ? Math.floor(size.flex * flexUnit)
        : size.height
      childY = mainPos
      
      // Apply alignment
      if (align === 'center') {
        childX = x + Math.floor((width - childWidth) / 2)
      } else if (align === 'end' || align === 'right') {
        childX = x + width - childWidth
      }
      
      mainPos += childHeight + gap
    }
    
    // Commit child layout
    if ('text' in child) {
      child.layout = {
        x: childX,
        y: childY,
        width: childWidth,
        height: childHeight,
      }
    } else {
      commitElementLayout(child, childX, childY, childWidth, childHeight)
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