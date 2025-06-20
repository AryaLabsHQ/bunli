/**
 * Terminal element types for the React reconciler
 */

import type { Style } from '../types.js'
import { DirtyRegionTracker } from './dirty-region-tracker.js'

export type TerminalNodeType = 'element' | 'text'

// Export additional types needed by index.ts
export type Position = { x: number; y: number }
export type ElementProps = Record<string, any>
export type TextContent = string
export type BoxContent = any[]
export type TerminalTextElement = TerminalText
export type TerminalBoxElement = TerminalElement

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Base interface for all terminal nodes
 */
export interface TerminalNode {
  type: TerminalNodeType
  parent: TerminalElement | null
}

/**
 * Terminal text node
 */
export interface TerminalText extends TerminalNode {
  type: 'text'
  text: string
  style?: Style
  
  // Layout information (calculated during layout phase)
  layout?: Bounds
}

/**
 * Props that all terminal elements can have
 */
export interface BaseProps {
  children?: any
  style?: Style
  key?: string | number
  
  // Layout props
  padding?: number | [number, number] | [number, number, number, number]
  margin?: number | [number, number] | [number, number, number, number]
  width?: number | string
  height?: number | string
  flex?: number
  
  // Events (future)
  onClick?: () => void
  onFocus?: () => void
}

/**
 * Box element props
 */
export interface BoxProps extends BaseProps {
  direction?: 'horizontal' | 'vertical'
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  overflow?: 'visible' | 'hidden' | 'scroll'
}

/**
 * Text element props
 */
export interface TextProps extends BaseProps {
  wrap?: 'wrap' | 'nowrap' | 'truncate'
  align?: 'left' | 'center' | 'right'
}

/**
 * Terminal element (box, text, etc.)
 */
export interface TerminalElement extends TerminalNode {
  type: 'element'
  elementType: string
  props: Record<string, any>
  children: Array<TerminalElement | TerminalText>
  
  // Layout information (calculated during layout phase)
  layout?: Bounds
  // Previous layout for dirty tracking
  previousLayout?: Bounds
  
  // Caching for optimization
  lastProps?: Record<string, any>
  dirtyLayout: boolean
  dirtyStyle: boolean
  
  // Track if content changed
  contentHash?: string
  previousContentHash?: string
  
  // Incremental layout optimization
  needsMeasure: boolean
  measureVersion: number
  constraintsHash: number
  intrinsicSize?: { width: number; height: number }
}

/**
 * Container that holds the root element
 */
export interface TerminalContainer {
  width: number
  height: number
  root: TerminalElement | null
  
  // Dirty tracking
  dirtyRegions: Set<Bounds> // Kept for backward compatibility
  dirtyTracker: DirtyRegionTracker
  
  // Performance metrics
  metrics: {
    lastRenderTime: number
    renderCount: number
    totalRenderTime: number
    averageRenderTime: number
    lastDirtyStats?: any
  }
  
  // Buffering
  previousBuffer?: string[][] // Previous frame for diffing
  
  // Output stream
  stream: NodeJS.WriteStream
}

/**
 * Create a terminal element
 */
export function createTerminalElement(
  elementType: string,
  props: Record<string, any>
): TerminalElement {
  return {
    type: 'element',
    elementType,
    props,
    children: [],
    parent: null,
    dirtyLayout: true,
    dirtyStyle: true,
    needsMeasure: true,
    measureVersion: 0,
    constraintsHash: 0,
  }
}

/**
 * Create a terminal text node
 */
export function createTerminalText(text: string, style?: Style): TerminalText {
  return {
    type: 'text',
    text,
    style,
    parent: null,
  }
}

/**
 * Create a terminal container
 */
export function createTerminalContainer(
  stream: NodeJS.WriteStream = process.stdout
): TerminalContainer {
  const width = stream.columns || 80
  const height = stream.rows || 24
  
  return {
    width,
    height,
    root: null,
    dirtyRegions: new Set(),
    dirtyTracker: new DirtyRegionTracker(width, height),
    metrics: {
      lastRenderTime: 0,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
    },
    stream,
  }
}

/**
 * Check if a node is a text node
 */
export function isTextNode(node: TerminalNode): node is TerminalText {
  return node.type === 'text'
}

/**
 * Check if a node is an element node
 */
export function isElementNode(node: TerminalNode): node is TerminalElement {
  return node.type === 'element'
}

/**
 * Mark an element's layout as dirty
 */
export function markLayoutDirty(element: TerminalElement): void {
  element.dirtyLayout = true
  
  // Propagate up the tree
  let parent = element.parent
  while (parent && !parent.dirtyLayout) {
    parent.dirtyLayout = true
    parent = parent.parent
  }
}

/**
 * Find the root container for an element
 */
export function findContainer(element: TerminalElement | TerminalContainer): TerminalContainer | null {
  let current = element as any
  while (current) {
    // Check if this is a container (has dirtyTracker)
    if (current.dirtyTracker && current.stream) {
      return current as TerminalContainer
    }
    current = current.parent
  }
  return null
}

/**
 * Mark a region as dirty in the container
 */
export function markRegionDirty(container: TerminalContainer, bounds: Bounds, priority = 0): void {
  // Check if container and dirtyTracker exist
  if (!container || !container.dirtyTracker) {
    return
  }
  
  // Use the smart dirty tracker
  container.dirtyTracker.markDirty(bounds, priority)
  // Also add to legacy set for backward compatibility
  if (container.dirtyRegions) {
    container.dirtyRegions.add(bounds)
  }
}

/**
 * Clear all dirty regions
 */
export function clearDirtyRegions(container: TerminalContainer): void {
  if (container?.dirtyRegions) {
    container.dirtyRegions.clear()
  }
  if (container?.dirtyTracker) {
    container.dirtyTracker.clear()
  }
}

/**
 * Get the bounds of all dirty regions combined
 */
export function getDirtyBounds(container: TerminalContainer): Bounds | null {
  if (container.dirtyRegions.size === 0) {
    return null
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const region of container.dirtyRegions) {
    minX = Math.min(minX, region.x)
    minY = Math.min(minY, region.y)
    maxX = Math.max(maxX, region.x + region.width)
    maxY = Math.max(maxY, region.y + region.height)
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}