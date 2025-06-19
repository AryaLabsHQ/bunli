/**
 * Layout system for terminal UI
 * Implements a simple constraint-based layout similar to Flutter/Yoga
 */

import type { 
  TerminalContainer, 
  TerminalElement, 
  TerminalNode,
  Bounds,
  BoxProps,
} from './terminal-element.js'
import { isTextNode, isElementNode, markRegionDirty } from './terminal-element.js'
import { normalizeSpacing } from '../types.js'

export interface LayoutConstraints {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

export interface LayoutSize {
  width: number
  height: number
}

/**
 * Perform layout for the entire tree
 */
export function performLayout(container: TerminalContainer): void {
  if (!container.root) return
  
  // Root constraints are the container size
  const constraints: LayoutConstraints = {
    minWidth: 0,
    maxWidth: container.width,
    minHeight: 0,
    maxHeight: container.height,
  }
  
  // Layout the root
  layoutElement(container.root, constraints, { x: 0, y: 0 })
}

/**
 * Layout a single element
 */
function layoutElement(
  element: TerminalElement,
  constraints: LayoutConstraints,
  position: { x: number; y: number }
): LayoutSize {
  // Skip hidden elements
  if (element.props.hidden) {
    element.layout = { x: 0, y: 0, width: 0, height: 0 }
    return { width: 0, height: 0 }
  }
  
  // Get element's layout properties
  const props = element.props as BoxProps
  const [mTop, mRight, mBottom, mLeft] = normalizeSpacing(props.margin)
  const [pTop, pRight, pBottom, pLeft] = normalizeSpacing(props.padding)
  
  // Account for border (1 char on each side)
  const borderOffset = (props.style as any)?.border && (props.style as any).border !== 'none' ? 1 : 0
  
  // Apply margin to constraints
  const marginConstraints: LayoutConstraints = {
    minWidth: Math.max(0, constraints.minWidth - mLeft - mRight),
    maxWidth: Math.max(0, constraints.maxWidth - mLeft - mRight),
    minHeight: Math.max(0, constraints.minHeight - mTop - mBottom),
    maxHeight: Math.max(0, constraints.maxHeight - mTop - mBottom),
  }
  
  // Apply explicit width/height if specified
  let width = marginConstraints.maxWidth
  let height = marginConstraints.maxHeight
  
  if (props.width !== undefined) {
    width = typeof props.width === 'number' 
      ? props.width 
      : parseFloat(props.width)
    width = Math.min(width, marginConstraints.maxWidth)
  }
  
  if (props.height !== undefined) {
    height = typeof props.height === 'number'
      ? props.height
      : parseFloat(props.height)
    height = Math.min(height, marginConstraints.maxHeight)
  }
  
  // Content constraints (after padding)
  const contentConstraints: LayoutConstraints = {
    minWidth: Math.max(0, width - pLeft - pRight),
    maxWidth: Math.max(0, width - pLeft - pRight),
    minHeight: Math.max(0, height - pTop - pBottom),
    maxHeight: Math.max(0, height - pTop - pBottom),
  }
  
  // Layout children based on element type
  let contentSize: LayoutSize
  
  switch (element.elementType) {
    case 'box':
    case 'row':
    case 'column':
      contentSize = layoutBox(element, contentConstraints, {
        x: position.x + mLeft + pLeft + borderOffset,
        y: position.y + mTop + pTop + borderOffset,
      })
      break
      
    case 'text':
      contentSize = layoutText(element, contentConstraints)
      break
      
    default:
      // Unknown element, just layout children vertically
      contentSize = layoutBox(element, contentConstraints, {
        x: position.x + mLeft + pLeft + borderOffset,
        y: position.y + mTop + pTop + borderOffset,
      })
  }
  
  // Calculate final size (including padding and border)
  const borderSpace = borderOffset * 2
  const finalWidth = props.width !== undefined 
    ? width 
    : Math.min(contentSize.width + pLeft + pRight + borderSpace, width)
    
  const finalHeight = props.height !== undefined
    ? height
    : Math.min(contentSize.height + pTop + pBottom + borderSpace, height)
  
  // Store layout information
  const oldLayout = element.layout
  
  // Store previous layout for dirty tracking
  if (oldLayout) {
    element.previousLayout = { ...oldLayout }
  }
  
  element.layout = {
    x: position.x + mLeft,
    y: position.y + mTop,
    width: finalWidth,
    height: finalHeight,
  }
  
  // Mark as dirty if layout changed
  if (!oldLayout || 
      oldLayout.x !== element.layout.x ||
      oldLayout.y !== element.layout.y ||
      oldLayout.width !== element.layout.width ||
      oldLayout.height !== element.layout.height) {
    const container = findContainer(element)
    if (container) {
      // Mark old position as dirty (to clear)
      if (oldLayout) {
        markRegionDirty(container, oldLayout, 1) // Higher priority for old position
      }
      // Mark new position as dirty (to draw)
      markRegionDirty(container, element.layout, 1) // Higher priority for visible content
    }
  }
  
  element.dirtyLayout = false
  
  return {
    width: finalWidth + mLeft + mRight,
    height: finalHeight + mTop + mBottom,
  }
}

/**
 * Layout a box element (handles flex layout)
 */
function layoutBox(
  element: TerminalElement,
  constraints: LayoutConstraints,
  position: { x: number; y: number }
): LayoutSize {
  const props = element.props as BoxProps
  const direction = props.direction || 
    (element.elementType === 'row' ? 'horizontal' : 'vertical')
  const gap = props.gap || 0
  
  if (direction === 'horizontal') {
    return layoutHorizontal(element, constraints, position, gap)
  } else {
    return layoutVertical(element, constraints, position, gap)
  }
}

/**
 * Layout children horizontally
 */
function layoutHorizontal(
  element: TerminalElement,
  constraints: LayoutConstraints,
  position: { x: number; y: number },
  gap: number
): LayoutSize {
  const children = element.children.filter(child => 
    !isTextNode(child) || child.text.trim().length > 0
  )
  
  if (children.length === 0) {
    return { width: 0, height: 0 }
  }
  
  // Calculate flex values
  let totalFlex = 0
  let totalFixedWidth = 0
  const childSizes: LayoutSize[] = []
  
  // First pass: measure non-flex children
  for (const child of children) {
    if (isTextNode(child)) {
      const size = measureText(child.text)
      childSizes.push(size)
      totalFixedWidth += size.width
    } else {
      const flex = child.props.flex || 0
      if (flex > 0) {
        totalFlex += flex
        childSizes.push({ width: 0, height: 0 })
      } else {
        // Measure with unlimited width
        const size = layoutElement(child, {
          ...constraints,
          maxWidth: Infinity,
        }, position)
        childSizes.push(size)
        totalFixedWidth += size.width
      }
    }
  }
  
  // Add gaps
  totalFixedWidth += gap * (children.length - 1)
  
  // Calculate flex width
  const availableWidth = Math.max(0, constraints.maxWidth - totalFixedWidth)
  const flexUnitWidth = totalFlex > 0 ? availableWidth / totalFlex : 0
  
  // Second pass: layout children with final positions
  let currentX = position.x
  let maxHeight = 0
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const size = childSizes[i]
    
    if (!child || !size) continue
    
    if (isTextNode(child)) {
      // Assign layout to text nodes
      child.layout = {
        x: currentX,
        y: position.y,
        width: size.width,
        height: size.height
      }
      currentX += size.width
      maxHeight = Math.max(maxHeight, size.height)
    } else {
      const flex = child.props.flex || 0
      const childWidth = flex > 0 ? Math.floor(flexUnitWidth * flex) : size.width
      
      const childSize = layoutElement(child, {
        minWidth: childWidth,
        maxWidth: childWidth,
        minHeight: 0,
        maxHeight: constraints.maxHeight,
      }, { x: currentX, y: position.y })
      
      currentX += childSize.width
      maxHeight = Math.max(maxHeight, childSize.height)
    }
    
    if (i < children.length - 1) {
      currentX += gap
    }
  }
  
  return {
    width: currentX - position.x,
    height: maxHeight,
  }
}

/**
 * Layout children vertically
 */
function layoutVertical(
  element: TerminalElement,
  constraints: LayoutConstraints,
  position: { x: number; y: number },
  gap: number
): LayoutSize {
  const children = element.children.filter(child => 
    !isTextNode(child) || child.text.trim().length > 0
  )
  
  if (children.length === 0) {
    return { width: 0, height: 0 }
  }
  
  let currentY = position.y
  let maxWidth = 0
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (!child) continue
    
    if (isTextNode(child)) {
      const size = measureText(child.text)
      // Assign layout to text nodes
      child.layout = {
        x: position.x,
        y: currentY,
        width: size.width,
        height: size.height
      }
      currentY += size.height
      maxWidth = Math.max(maxWidth, size.width)
    } else {
      const remainingHeight = Math.max(0, constraints.maxHeight - (currentY - position.y))
      
      const childSize = layoutElement(child, {
        minWidth: 0,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: remainingHeight,
      }, { x: position.x, y: currentY })
      
      currentY += childSize.height
      maxWidth = Math.max(maxWidth, childSize.width)
    }
    
    if (i < children.length - 1) {
      currentY += gap
    }
  }
  
  return {
    width: maxWidth,
    height: currentY - position.y,
  }
}

/**
 * Layout text element
 */
function layoutText(
  element: TerminalElement,
  constraints: LayoutConstraints
): LayoutSize {
  // Collect all text from children
  const text = collectText(element)
  
  // For now, simple text measurement
  // TODO: Handle wrapping, truncation, etc.
  return measureText(text)
}

/**
 * Measure text dimensions
 */
function measureText(text: string): LayoutSize {
  const lines = text.split('\n')
  const width = Math.max(...lines.map(line => line.length))
  const height = lines.length
  
  return { width, height }
}

/**
 * Collect text from element children
 */
function collectText(element: TerminalElement): string {
  const parts: string[] = []
  
  // Check if the element has direct text content in props.children
  if (typeof element.props.children === 'string') {
    parts.push(element.props.children)
  } else if (typeof element.props.children === 'number') {
    parts.push(String(element.props.children))
  }
  
  // Also collect from child nodes
  for (const child of element.children) {
    if (isTextNode(child)) {
      parts.push(child.text)
    } else if (isElementNode(child)) {
      parts.push(collectText(child))
    }
  }
  
  return parts.join('')
}

/**
 * Find the container for an element
 */
function findContainer(element: TerminalElement): TerminalContainer | null {
  let current: TerminalNode | null = element
  
  while (current && current.parent) {
    current = current.parent
  }
  
  // Get container from root element
  if (current && !isTextNode(current)) {
    return (current as any)._container || null
  }
  
  return null
}