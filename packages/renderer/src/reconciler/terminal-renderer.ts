/**
 * Unified terminal renderer with differential updates
 * Combines correctness and performance optimization
 */

import type { 
  TerminalContainer, 
  TerminalElement, 
  TerminalNode,
  TerminalText,
  Bounds,
} from './terminal-element.js'
import { isTextNode, isElementNode } from './terminal-element.js'
import { applyStyle, getBorderChars } from '../core/ansi.js'
import type { Style } from '../types.js'

// Cell represents a single character on the terminal
interface Cell {
  char: string
  style?: Style
}

// Buffer is a 2D array of cells
type Buffer = (Cell | null)[][]

// Rendering metrics
interface RenderMetrics {
  renderCount: number
  totalRenderTime: number
  lastRenderTime: number
  averageRenderTime: number
  dirtyRegionStats: {
    regionCount: number
    coverage: number
  }
}

/**
 * Unified renderer that handles both simple and optimized rendering
 */
export class TerminalRenderer {
  private currentBuffer: Buffer
  private previousBuffer: Buffer | null = null
  private metrics: RenderMetrics = {
    renderCount: 0,
    totalRenderTime: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    dirtyRegionStats: {
      regionCount: 0,
      coverage: 0
    }
  }
  
  constructor(private container: TerminalContainer) {
    this.currentBuffer = this.createBuffer(container.width, container.height)
  }
  
  /**
   * Create an empty buffer
   */
  private createBuffer(width: number, height: number): Buffer {
    const buffer: Buffer = []
    for (let y = 0; y < height; y++) {
      buffer[y] = new Array(width).fill(null)
    }
    return buffer
  }
  
  /**
   * Handle terminal resize
   */
  resize(width: number, height: number): void {
    // Create new buffer with new dimensions
    const newBuffer = this.createBuffer(width, height)
    
    // Copy existing content that fits
    if (this.currentBuffer) {
      const copyHeight = Math.min(height, this.currentBuffer.length)
      const copyWidth = Math.min(width, this.currentBuffer[0]?.length || 0)
      
      for (let y = 0; y < copyHeight; y++) {
        for (let x = 0; x < copyWidth; x++) {
          const cell = this.currentBuffer[y]?.[x]
          if (cell) {
            const newRow = newBuffer[y]
            if (newRow) {
              newRow[x] = cell
            }
          }
        }
      }
    }
    
    this.currentBuffer = newBuffer
    this.previousBuffer = null // Force full redraw
    this.container.dirtyTracker.markFullRedraw()
  }
  
  /**
   * Render the terminal tree with differential updates
   */
  render(): void {
    const startTime = performance.now()
    
    if (!this.container.root || !this.container.root.layout) {
      return
    }
    
    // Clear current buffer
    this.currentBuffer = this.createBuffer(this.container.width, this.container.height)
    
    // Render tree into buffer
    this.renderNode(this.container.root, this.currentBuffer)
    
    // Get dirty regions from tracker
    const dirtyRegions = this.container.dirtyTracker.getDirtyRegions()
    const needsFullRedraw = this.container.dirtyTracker.needsFullRedraw()
    
    // Generate differential update commands
    const commands = this.generateDifferentialCommands(dirtyRegions, needsFullRedraw)
    
    // Write to terminal
    if (commands.length > 0) {
      this.container.stream.write(commands.join(''))
    }
    
    // Update metrics
    const renderTime = performance.now() - startTime
    this.updateMetrics(renderTime, dirtyRegions)
    
    // Swap buffers
    this.previousBuffer = this.currentBuffer
    
    // Clear dirty regions
    this.container.dirtyTracker.clear()
  }
  
  /**
   * Generate ANSI commands for differential updates
   */
  private generateDifferentialCommands(dirtyRegions: Bounds[], needsFullRedraw: boolean): string[] {
    const commands: string[] = []
    
    // If no previous buffer or full redraw needed
    if (!this.previousBuffer || needsFullRedraw) {
      this.generateFullScreenCommands(commands)
    } else if (dirtyRegions.length > 0) {
      // Differential update - only render dirty regions
      this.generateDirtyRegionCommands(commands, dirtyRegions)
    }
    
    return commands
  }
  
  /**
   * Generate commands for full screen render
   */
  private generateFullScreenCommands(commands: string[]): void {
    // Move cursor to top
    commands.push('\x1b[H')
    
    for (let y = 0; y < this.container.height; y++) {
      const row = this.currentBuffer[y]
      if (!row) continue
      
      // Move to line
      commands.push(`\x1b[${y + 1};1H`)
      // Clear line
      commands.push('\x1b[2K')
      
      let lineContent = ''
      let lastStyle: Style | undefined
      let lastX = -1
      
      for (let x = 0; x < this.container.width; x++) {
        const cell = row[x]
        
        if (cell) {
          // Add leading spaces if this is the first character and it's not at position 0
          if (lastX === -1 && x > 0) {
            lineContent += ' '.repeat(x)
          }
          // Add spaces if there was a gap between characters
          else if (lastX >= 0 && x > lastX + 1) {
            lineContent += ' '.repeat(x - lastX - 1)
          }
          
          // Apply style if changed
          const styleChanged = JSON.stringify(cell.style) !== JSON.stringify(lastStyle)
          if (styleChanged) {
            if (lastStyle) {
              lineContent += '\x1b[0m' // Reset
            }
            if (cell.style) {
              lineContent += applyStyle('', cell.style)
            }
            lastStyle = cell.style
          }
          
          lineContent += cell.char
          lastX = x
        }
      }
      
      // Reset style at end of line
      if (lastStyle) {
        lineContent += '\x1b[0m'
      }
      
      if (lineContent.trim()) {
        commands.push(lineContent)
      }
    }
  }
  
  /**
   * Generate commands for dirty regions only
   */
  private generateDirtyRegionCommands(commands: string[], regions: Bounds[]): void {
    // Sort regions by y, then x for efficient cursor movement
    const sortedRegions = [...regions].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y
      return a.x - b.x
    })
    
    let currentStyle: Style | undefined
    
    for (const region of sortedRegions) {
      for (let y = region.y; y < region.y + region.height && y < this.container.height; y++) {
        const row = this.currentBuffer[y]
        const prevRow = this.previousBuffer?.[y]
        if (!row) continue
        
        let needsMove = true
        let lineHasChanges = false
        let lineContent = ''
        
        // Check if this line in the region has any changes
        for (let x = region.x; x < region.x + region.width && x < this.container.width; x++) {
          const cell = row[x]
          const prevCell = prevRow?.[x]
          
          if (cell?.char !== prevCell?.char || 
              JSON.stringify(cell?.style) !== JSON.stringify(prevCell?.style)) {
            lineHasChanges = true
            break
          }
        }
        
        if (!lineHasChanges) continue
        
        // Render the changed portion of the line
        let firstChange = -1
        let lastChange = -1
        
        // Find the range of actual changes - including areas that need clearing
        for (let x = region.x; x < region.x + region.width && x < this.container.width; x++) {
          const cell = row[x]
          const prevCell = prevRow?.[x]
          
          // Check if content changed or if we need to clear previous content
          if (cell?.char !== prevCell?.char || 
              JSON.stringify(cell?.style) !== JSON.stringify(prevCell?.style) ||
              (!cell && prevCell)) {
            if (firstChange === -1) firstChange = x
            lastChange = x
          }
        }
        
        if (firstChange === -1) continue
        
        // Move cursor to first change
        commands.push(`\x1b[${y + 1};${firstChange + 1}H`)
        
        // Render from first to last change
        for (let x = firstChange; x <= lastChange && x < this.container.width; x++) {
          const cell = row[x]
          
          if (cell && cell.char) {
            // Apply style if changed
            const newStyle = cell.style
            if (JSON.stringify(newStyle) !== JSON.stringify(currentStyle)) {
              if (currentStyle) {
                commands.push('\x1b[0m')
              }
              if (newStyle) {
                commands.push(applyStyle('', newStyle))
              }
              currentStyle = newStyle
            }
            
            // Write character
            commands.push(cell.char)
          } else {
            // Reset style before writing space
            if (currentStyle) {
              commands.push('\x1b[0m')
              currentStyle = undefined
            }
            // Write space for empty cells or to clear previous content
            commands.push(' ')
          }
        }
      }
    }
    
    // Reset style
    if (currentStyle) {
      commands.push('\x1b[0m')
    }
  }
  
  /**
   * Render a node into the buffer
   */
  private renderNode(
    node: TerminalNode, 
    buffer: Buffer, 
    parentStyle?: Style,
    parentBounds?: Bounds
  ): void {
    if (isTextNode(node)) {
      this.renderText(node, buffer, parentStyle, parentBounds)
    } else if (isElementNode(node)) {
      this.renderElement(node, buffer, parentBounds)
    }
  }
  
  /**
   * Render text node
   */
  private renderText(
    text: TerminalText, 
    buffer: Buffer, 
    parentStyle?: Style,
    parentBounds?: Bounds
  ): void {
    if (!text.layout) return
    
    const { x, y, width, height } = text.layout
    const style = text.style || parentStyle
    
    // Clip to parent bounds if provided
    if (parentBounds) {
      // Skip if completely outside parent
      if (x >= parentBounds.x + parentBounds.width || 
          y >= parentBounds.y + parentBounds.height ||
          x + width <= parentBounds.x ||
          y + height <= parentBounds.y) {
        return
      }
    }
    
    const lines = text.text.split('\n')
    for (let i = 0; i < lines.length && i < height; i++) {
      const line = lines[i]
      const lineY = y + i
      
      if (lineY >= 0 && lineY < buffer.length) {
        const lineLength = line?.length || 0
        for (let j = 0; j < lineLength && j < width; j++) {
          const charX = x + j
          const row = buffer[lineY]
          if (row && charX >= 0 && charX < row.length) {
            row[charX] = {
              char: line?.[j] || ' ',
              style
            }
          }
        }
      }
    }
  }
  
  /**
   * Render an element to the buffer
   */
  private renderElement(
    element: TerminalElement, 
    buffer: Buffer,
    parentBounds?: Bounds
  ): void {
    if (!element.layout || element.props.hidden) {
      return
    }
    
    const { x, y, width, height } = element.layout
    const style = element.props.style as Style | undefined
    
    // Skip if completely outside viewport
    if (x + width <= 0 || x >= this.container.width ||
        y + height <= 0 || y >= this.container.height) {
      return
    }
    
    // Render background if specified
    if (style?.backgroundColor) {
      const bgStartX = style?.border ? x + 1 : x
      const bgStartY = style?.border ? y + 1 : y
      const bgWidth = style?.border ? Math.max(0, width - 2) : width
      const bgHeight = style?.border ? Math.max(0, height - 2) : height
      
      for (let dy = 0; dy < bgHeight; dy++) {
        const lineY = bgStartY + dy
        if (lineY >= 0 && lineY < buffer.length) {
          for (let dx = 0; dx < bgWidth; dx++) {
            const charX = bgStartX + dx
            const row = buffer[lineY]
            if (row && charX >= 0 && charX < row.length) {
              if (!row[charX]) {
                row[charX] = {
                  char: ' ',
                  style: { backgroundColor: style.backgroundColor }
                }
              }
            }
          }
        }
      }
    }
    
    // Render border if specified
    if (style?.border && style.border !== 'none') {
      const chars = getBorderChars(style.border)
      if (chars) {
        this.renderBorder(buffer, { x, y, width, height }, chars, style)
      }
    }
    
    // Render content based on element type
    if (element.elementType === 'text') {
      this.renderTextElement(element, buffer, parentBounds)
    } else {
      // Calculate content bounds for children (inside padding and border)
      const contentBounds: Bounds = {
        x: x + (style?.border && style.border !== 'none' ? 1 : 0),
        y: y + (style?.border && style.border !== 'none' ? 1 : 0),
        width: width - (style?.border && style.border !== 'none' ? 2 : 0),
        height: height - (style?.border && style.border !== 'none' ? 2 : 0)
      }
      
      // Render children with content bounds
      for (const child of element.children) {
        this.renderNode(child, buffer, style, contentBounds)
      }
    }
  }
  
  /**
   * Render text element (extracts text from props.children)
   */
  private renderTextElement(
    element: TerminalElement, 
    buffer: Buffer,
    parentBounds?: Bounds
  ): void {
    if (!element.layout) return
    
    const style = element.props.style as Style | undefined
    
    // Use the processed text from layout phase if available
    let text = (element as any)._processedText
    
    // Fallback to extracting text if no processed text
    if (!text) {
      text = this.extractText(element)
      
      // If no text found in props, check if this is a container with text node children
      if (!text && element.children.length > 0) {
        // For text elements, the actual text might be in child text nodes
        const childText = element.children
          .filter(isTextNode)
          .map(node => node.text)
          .join('')
        if (childText) {
          text = childText
        }
      }
    }
    
    if (!text) return
    
    this.renderTextContent(text, element.layout, buffer, style, parentBounds)
  }
  
  /**
   * Render text content at a specific location
   */
  private renderTextContent(
    text: string,
    layout: { x: number; y: number; width: number; height: number },
    buffer: Buffer,
    style?: Style,
    parentBounds?: Bounds
  ): void {
    let { x, y } = layout
    const { width, height } = layout
    
    const lines = text.split('\n')
    for (let i = 0; i < lines.length && i < height; i++) {
      const line = lines[i]
      const lineY = y + i
      
      // Skip if line is outside parent bounds
      if (parentBounds) {
        if (lineY < parentBounds.y || lineY >= parentBounds.y + parentBounds.height) {
          continue
        }
      }
      
      if (lineY >= 0 && lineY < buffer.length) {
        const lineLength = line?.length || 0
        for (let j = 0; j < lineLength && j < width; j++) {
          const charX = x + j
          
          // Skip if character is outside parent bounds
          if (parentBounds) {
            if (charX < parentBounds.x || charX >= parentBounds.x + parentBounds.width) {
              continue
            }
          }
          
          const row = buffer[lineY]
          if (row && charX >= 0 && charX < row.length) {
            row[charX] = {
              char: line?.[j] || ' ',
              style
            }
          }
        }
      }
    }
  }
  
  /**
   * Extract text content from element
   */
  private extractText(element: TerminalElement): string {
    const parts: string[] = []
    
    // Check if the element has direct text content in props.children
    if (typeof element.props.children === 'string') {
      parts.push(element.props.children)
    } else if (typeof element.props.children === 'number') {
      parts.push(String(element.props.children))
    } else if (Array.isArray(element.props.children)) {
      for (const child of element.props.children) {
        if (typeof child === 'string') {
          parts.push(child)
        } else if (typeof child === 'number') {
          parts.push(String(child))
        }
      }
    }
    
    // Also collect from text node children (created by reconciler)
    for (const child of element.children) {
      if (isTextNode(child)) {
        parts.push(child.text)
      }
    }
    
    return parts.join('')
  }
  
  /**
   * Render border
   */
  private renderBorder(
    buffer: Buffer,
    bounds: Bounds,
    chars: any,
    style: Style
  ): void {
    const { x, y, width, height } = bounds
    
    // Helper to set cell if in bounds
    const setCell = (cellX: number, cellY: number, char: string) => {
      const row = buffer[cellY]
      if (cellY >= 0 && cellY < buffer.length && row &&
          cellX >= 0 && cellX < row.length) {
        row[cellX] = { char, style }
      }
    }
    
    // Top border
    setCell(x, y, chars.topLeft)
    for (let i = 1; i < width - 1; i++) {
      setCell(x + i, y, chars.top)
    }
    if (width > 1) {
      setCell(x + width - 1, y, chars.topRight)
    }
    
    // Side borders
    for (let i = 1; i < height - 1; i++) {
      setCell(x, y + i, chars.left)
      if (width > 1) {
        setCell(x + width - 1, y + i, chars.right)
      }
    }
    
    // Bottom border
    if (height > 1) {
      setCell(x, y + height - 1, chars.bottomLeft)
      for (let i = 1; i < width - 1; i++) {
        setCell(x + i, y + height - 1, chars.bottom)
      }
      if (width > 1) {
        setCell(x + width - 1, y + height - 1, chars.bottomRight)
      }
    }
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(renderTime: number, dirtyRegions: Bounds[]): void {
    this.metrics.renderCount++
    this.metrics.totalRenderTime += renderTime
    this.metrics.lastRenderTime = renderTime
    this.metrics.averageRenderTime = this.metrics.totalRenderTime / this.metrics.renderCount
    
    // Calculate dirty region coverage
    let totalArea = 0
    for (const region of dirtyRegions) {
      totalArea += region.width * region.height
    }
    const screenArea = this.container.width * this.container.height
    
    this.metrics.dirtyRegionStats = {
      regionCount: dirtyRegions.length,
      coverage: screenArea > 0 ? totalArea / screenArea : 0
    }
  }
  
  /**
   * Get rendering metrics
   */
  getMetrics(): RenderMetrics {
    return { ...this.metrics }
  }
}

// Keep a map of containers to their renderers
const rendererMap = new WeakMap<TerminalContainer, TerminalRenderer>()

// Store the last active container for metrics (temporary solution)
let lastActiveContainer: TerminalContainer | undefined

/**
 * Render the terminal UI using differential updates
 */
export function renderToTerminal(container: TerminalContainer): void {
  // Get or create renderer
  let renderer = rendererMap.get(container)
  
  if (!renderer) {
    renderer = new TerminalRenderer(container)
    rendererMap.set(container, renderer)
  }
  
  // Handle resize if needed
  if (container.stream) {
    const currentWidth = container.stream.columns || 80
    const currentHeight = container.stream.rows || 24
    
    if (currentWidth !== container.width || currentHeight !== container.height) {
      container.width = currentWidth
      container.height = currentHeight
      renderer.resize(currentWidth, currentHeight)
    }
  }
  
  // Render using differential updates
  renderer.render()
  
  // Store as last active container
  lastActiveContainer = container
}

/**
 * Force a full redraw
 */
export function forceFullRedraw(container: TerminalContainer): void {
  container.dirtyTracker.markFullRedraw()
  renderToTerminal(container)
}

/**
 * Get rendering metrics
 */
export function getRenderingMetrics(container?: TerminalContainer): RenderMetrics {
  // Use provided container or fall back to last active
  const targetContainer = container || lastActiveContainer
  
  if (!targetContainer) {
    return {
      renderCount: 0,
      totalRenderTime: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      dirtyRegionStats: {
        regionCount: 0,
        coverage: 0
      }
    }
  }
  
  const renderer = rendererMap.get(targetContainer)
  return renderer ? renderer.getMetrics() : {
    renderCount: 0,
    totalRenderTime: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    dirtyRegionStats: {
      regionCount: 0,
      coverage: 0
    }
  }
}

/**
 * Helper function to collect text content
 */
export function collectText(node: TerminalNode): string {
  if (isTextNode(node)) {
    return node.text
  } else if (isElementNode(node) && node.children) {
    return node.children.map(collectText).join('')
  }
  return ''
}