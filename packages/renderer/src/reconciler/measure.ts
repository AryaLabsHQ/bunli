/**
 * Pure measurement phase for terminal layout
 * Calculates sizes without mutating layout positions
 */

import type { 
  TerminalElement, 
  TerminalNode,
  isTextNode,
} from './terminal-element.js'
import type { BoxProps } from './terminal-element.js'
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

// Global measure version for cache invalidation
let currentMeasureVersion = 0

export function incrementMeasureVersion(): void {
  currentMeasureVersion++
}

/**
 * Hash constraints for fast comparison
 */
function hashConstraints(c: LayoutConstraints): number {
  // Simple hash combining all values
  return (c.minWidth * 7919) ^ (c.maxWidth * 6271) ^ 
         (c.minHeight * 4933) ^ (c.maxHeight * 3571)
}

/**
 * Measure an element and its children
 */
export function measureElement(
  element: TerminalElement,
  constraints: LayoutConstraints
): LayoutSize {
  const constraintHash = hashConstraints(constraints)
  
  // Check cache
  if (
    element.measureVersion === currentMeasureVersion &&
    element.constraintsHash === constraintHash &&
    element.intrinsicSize &&
    !element.needsMeasure
  ) {
    return element.intrinsicSize
  }
  
  // Get element's layout properties
  const props = element.props as BoxProps
  const [mTop, mRight, mBottom, mLeft] = normalizeSpacing(props.margin)
  const [pTop, pRight, pBottom, pLeft] = normalizeSpacing(props.padding)
  
  // Account for border
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
    if (typeof props.width === 'string' && props.width.endsWith('%')) {
      const percentage = parseFloat(props.width) / 100
      width = Math.floor(marginConstraints.maxWidth * percentage)
    } else {
      width = typeof props.width === 'number' 
        ? props.width 
        : parseFloat(props.width)
    }
    width = Math.min(width, marginConstraints.maxWidth)
  }
  
  if (props.height !== undefined) {
    if (typeof props.height === 'string' && props.height.endsWith('%')) {
      const percentage = parseFloat(props.height) / 100
      height = Math.floor(marginConstraints.maxHeight * percentage)
    } else {
      height = typeof props.height === 'number'
        ? props.height
        : parseFloat(props.height)
    }
    height = Math.min(height, marginConstraints.maxHeight)
  }
  
  // Content constraints (after padding and border)
  const contentConstraints: LayoutConstraints = {
    minWidth: Math.max(0, width - pLeft - pRight - borderOffset * 2),
    maxWidth: Math.max(0, width - pLeft - pRight - borderOffset * 2),
    minHeight: Math.max(0, height - pTop - pBottom - borderOffset * 2),
    maxHeight: Math.max(0, height - pTop - pBottom - borderOffset * 2),
  }
  
  // Measure content based on element type
  let contentSize: LayoutSize
  
  switch (element.elementType) {
    case 'box':
    case 'row':
    case 'column':
      const direction = props.direction || 
        (element.elementType === 'row' ? 'horizontal' : 'vertical')
      contentSize = measureFlexChildren(element, contentConstraints, direction, props.gap || 0)
      break
      
    case 'text':
      contentSize = measureText(element, contentConstraints)
      break
      
    default:
      contentSize = measureFlexChildren(element, contentConstraints, 'vertical', 0)
  }
  
  // Calculate final size
  const borderSpace = borderOffset * 2
  const shouldStretch = element.elementType === 'box' && props.width === undefined && !props.flex
  
  const finalWidth = props.width !== undefined 
    ? width 
    : shouldStretch
      ? width
      : Math.min(contentSize.width + pLeft + pRight + borderSpace, width)
    
  const finalHeight = props.height !== undefined
    ? height
    : Math.min(contentSize.height + pTop + pBottom + borderSpace, height)
  
  const size: LayoutSize = {
    width: finalWidth + mLeft + mRight,
    height: finalHeight + mTop + mBottom,
  }
  
  // Update cache
  element.measureVersion = currentMeasureVersion
  element.constraintsHash = constraintHash
  element.intrinsicSize = size
  element.needsMeasure = false
  
  return size
}

/**
 * Measure flex children
 */
function measureFlexChildren(
  element: TerminalElement,
  constraints: LayoutConstraints,
  direction: 'horizontal' | 'vertical',
  gap: number
): LayoutSize {
  const children = element.children.filter(child => {
    if ('text' in child && child.text.trim().length === 0) return false
    return true
  })
  
  if (children.length === 0) {
    return { width: 0, height: 0 }
  }
  
  // For simplicity in the measure phase, we assume flex children
  // will use their natural sizes plus flex distribution
  let totalMainSize = 0
  let maxCrossSize = 0
  
  for (const child of children) {
    if ('text' in child) {
      const size = measureTextContent(child.text)
      if (direction === 'horizontal') {
        totalMainSize += size.width
        maxCrossSize = Math.max(maxCrossSize, size.height)
      } else {
        totalMainSize += size.height
        maxCrossSize = Math.max(maxCrossSize, size.width)
      }
    } else {
      // Measure child with unlimited main axis
      const childConstraints = direction === 'horizontal'
        ? { ...constraints, maxWidth: Infinity }
        : { ...constraints, maxHeight: Infinity }
      
      const size = measureElement(child, childConstraints)
      
      if (direction === 'horizontal') {
        totalMainSize += size.width
        maxCrossSize = Math.max(maxCrossSize, size.height)
      } else {
        totalMainSize += size.height
        maxCrossSize = Math.max(maxCrossSize, size.width)
      }
    }
  }
  
  // Add gaps
  totalMainSize += gap * (children.length - 1)
  
  return direction === 'horizontal'
    ? { width: totalMainSize, height: maxCrossSize }
    : { width: maxCrossSize, height: totalMainSize }
}

/**
 * Measure text element
 */
function measureText(
  element: TerminalElement,
  constraints: LayoutConstraints
): LayoutSize {
  // Collect all text from children
  const text = collectText(element)
  
  // Handle text wrapping
  const props = element.props
  const wrap = props.wrap || 'nowrap'
  const maxWidth = constraints.maxWidth
  
  let processedText = text
  
  if (wrap === 'nowrap' || maxWidth === Infinity) {
    processedText = text
  } else if (wrap === 'truncate') {
    processedText = text.length > maxWidth ? text.substring(0, maxWidth - 3) + '...' : text
  } else if (wrap === 'wrap') {
    processedText = wrapText(text, maxWidth)
  }
  
  // Store processed text for render phase
  ;(element as any)._processedText = processedText
  
  return measureTextContent(processedText)
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return ''
  
  const lines: string[] = []
  const inputLines = text.split('\n')
  
  for (const inputLine of inputLines) {
    if (inputLine.length <= maxWidth) {
      lines.push(inputLine)
      continue
    }
    
    // Word wrapping
    const words = inputLine.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      if (word.length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = ''
        }
        
        // Break long word
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.substring(i, i + maxWidth))
        }
        continue
      }
      
      const testLine = currentLine ? currentLine + ' ' + word : word
      if (testLine.length > maxWidth) {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) lines.push(currentLine)
  }
  
  return lines.join('\n')
}

/**
 * Measure text dimensions
 */
function measureTextContent(text: string): LayoutSize {
  const lines = text.split('\n')
  const width = lines.length > 0 ? Math.max(...lines.map(line => line.length)) : 0
  const height = lines.length || 1
  
  return { width, height }
}

/**
 * Collect text from element
 */
function collectText(element: TerminalElement): string {
  const parts: string[] = []
  
  if (typeof element.props.children === 'string') {
    parts.push(element.props.children)
  } else if (typeof element.props.children === 'number') {
    parts.push(String(element.props.children))
  }
  
  for (const child of element.children) {
    if ('text' in child) {
      parts.push(child.text)
    }
  }
  
  return parts.join('')
} 