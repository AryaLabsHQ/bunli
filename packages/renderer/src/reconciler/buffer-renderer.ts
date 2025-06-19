/**
 * Zero-copy ANSI buffer renderer using Uint8Array
 * This renderer uses pre-allocated buffers to avoid string concatenation overhead
 */

import type { 
  TerminalContainer, 
  TerminalElement, 
  TerminalNode,
  TerminalText,
  Bounds,
} from './terminal-element.js'
import { isTextNode, isElementNode } from './terminal-element.js'
import { getBorderChars } from '../core/ansi.js'
import type { Style } from '../types.js'

// Pre-calculated ANSI escape sequences as byte arrays
const ANSI_RESET = new Uint8Array([0x1b, 0x5b, 0x30, 0x6d]) // \x1b[0m
const ANSI_CURSOR_HOME = new Uint8Array([0x1b, 0x5b, 0x48]) // \x1b[H
const ANSI_CLEAR_LINE = new Uint8Array([0x1b, 0x5b, 0x32, 0x4b]) // \x1b[2K

// Color codes map
const COLOR_CODES: Record<string, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  redBright: 91,
  greenBright: 92,
  yellowBright: 93,
  blueBright: 94,
  magentaBright: 95,
  cyanBright: 96,
  whiteBright: 97
}

const BG_COLOR_CODES: Record<string, number> = {
  black: 40,
  red: 41,
  green: 42,
  yellow: 43,
  blue: 44,
  magenta: 45,
  cyan: 46,
  white: 47,
  gray: 100,
  redBright: 101,
  greenBright: 102,
  yellowBright: 103,
  blueBright: 104,
  magentaBright: 105,
  cyanBright: 106,
  whiteBright: 107
}

/**
 * Buffer writer that manages a growing byte buffer
 */
class BufferWriter {
  private buffer: Uint8Array
  private position = 0
  private textEncoder = new TextEncoder()
  
  constructor(initialSize = 65536) { // 64KB initial
    this.buffer = new Uint8Array(initialSize)
  }
  
  /**
   * Ensure buffer has enough space
   */
  private ensureCapacity(needed: number): void {
    if (this.position + needed > this.buffer.length) {
      // Double the buffer size
      const newSize = Math.max(this.buffer.length * 2, this.position + needed)
      const newBuffer = new Uint8Array(newSize)
      newBuffer.set(this.buffer.subarray(0, this.position))
      this.buffer = newBuffer
    }
  }
  
  /**
   * Write raw bytes
   */
  writeBytes(bytes: Uint8Array): void {
    this.ensureCapacity(bytes.length)
    this.buffer.set(bytes, this.position)
    this.position += bytes.length
  }
  
  /**
   * Write a string
   */
  writeString(str: string): void {
    const bytes = this.textEncoder.encode(str)
    this.writeBytes(bytes)
  }
  
  /**
   * Write a single byte
   */
  writeByte(byte: number): void {
    this.ensureCapacity(1)
    this.buffer[this.position++] = byte
  }
  
  /**
   * Write cursor position command
   */
  writeCursorPosition(row: number, col: number): void {
    // \x1b[{row};{col}H
    this.writeByte(0x1b)
    this.writeByte(0x5b)
    this.writeString(row.toString())
    this.writeByte(0x3b)
    this.writeString(col.toString())
    this.writeByte(0x48)
  }
  
  /**
   * Write style ANSI codes
   */
  writeStyle(style: Style): void {
    const codes: number[] = []
    
    if (style.bold) codes.push(1)
    if (style.dim) codes.push(2)
    if (style.italic) codes.push(3)
    if (style.underline) codes.push(4)
    if (style.inverse) codes.push(7)
    if (style.strikethrough) codes.push(9)
    
    if (style.color && typeof style.color === 'string') {
      const colorCode = COLOR_CODES[style.color]
      if (colorCode !== undefined) {
        codes.push(colorCode)
      }
    }
    
    if (style.backgroundColor && typeof style.backgroundColor === 'string') {
      const bgCode = BG_COLOR_CODES[style.backgroundColor]
      if (bgCode !== undefined) {
        codes.push(bgCode)
      }
    }
    
    if (codes.length > 0) {
      // \x1b[{codes}m
      this.writeByte(0x1b)
      this.writeByte(0x5b)
      for (let i = 0; i < codes.length; i++) {
        if (i > 0) this.writeByte(0x3b)
        const code = codes[i]
        if (code !== undefined) {
          this.writeString(code.toString())
        }
      }
      this.writeByte(0x6d)
    }
  }
  
  /**
   * Get the final buffer
   */
  getBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.position)
  }
  
  /**
   * Reset the writer
   */
  reset(): void {
    this.position = 0
  }
}

// Cell represents a single character on the terminal
interface Cell {
  char: string
  style?: Style
}

// Buffer is a 2D array of cells
type Buffer = (Cell | null)[][]

/**
 * Zero-copy buffer renderer
 */
export class BufferRenderer {
  private currentBuffer: Buffer
  private previousBuffer: Buffer | null = null
  private writer: BufferWriter
  
  constructor(private container: TerminalContainer) {
    this.currentBuffer = this.createBuffer(container.width, container.height)
    this.writer = new BufferWriter()
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
    this.previousBuffer = null
    this.container.dirtyTracker.markFullRedraw()
  }
  
  /**
   * Render the terminal tree with zero-copy output
   */
  render(): Uint8Array {
    if (!this.container.root || !this.container.root.layout) {
      return new Uint8Array(0)
    }
    
    // Clear current buffer
    this.currentBuffer = this.createBuffer(this.container.width, this.container.height)
    
    // Render tree into buffer
    this.renderNode(this.container.root, this.currentBuffer)
    
    // Get dirty regions from tracker
    const dirtyRegions = this.container.dirtyTracker.getDirtyRegions()
    const needsFullRedraw = this.container.dirtyTracker.needsFullRedraw()
    
    // Reset writer
    this.writer.reset()
    
    // Generate differential update commands
    if (!this.previousBuffer || needsFullRedraw) {
      this.generateFullScreenCommands()
    } else if (dirtyRegions.length > 0) {
      this.generateDirtyRegionCommands(dirtyRegions)
    }
    
    // Swap buffers
    this.previousBuffer = this.currentBuffer
    
    // Clear dirty regions
    this.container.dirtyTracker.clear()
    
    // Return the buffer
    return this.writer.getBuffer()
  }
  
  /**
   * Generate commands for full screen render
   */
  private generateFullScreenCommands(): void {
    // Move cursor to top
    this.writer.writeBytes(ANSI_CURSOR_HOME)
    
    for (let y = 0; y < this.container.height; y++) {
      const row = this.currentBuffer[y]
      if (!row) continue
      
      // Move to line and clear
      this.writer.writeCursorPosition(y + 1, 1)
      this.writer.writeBytes(ANSI_CLEAR_LINE)
      
      let lastStyle: Style | undefined
      let hasContent = false
      let lastX = -1
      
      for (let x = 0; x < this.container.width; x++) {
        const cell = row[x]
        
        if (cell) {
          // Add leading spaces if needed
          if (lastX === -1 && x > 0) {
            this.writer.writeString(' '.repeat(x))
          } else if (lastX >= 0 && x > lastX + 1) {
            this.writer.writeString(' '.repeat(x - lastX - 1))
          }
          
          // Apply style if changed
          if (!this.stylesEqual(cell.style, lastStyle)) {
            if (lastStyle) {
              this.writer.writeBytes(ANSI_RESET)
            }
            if (cell.style) {
              this.writer.writeStyle(cell.style)
            }
            lastStyle = cell.style
          }
          
          this.writer.writeString(cell.char)
          lastX = x
          hasContent = true
        }
      }
      
      // Reset style at end of line if needed
      if (lastStyle && hasContent) {
        this.writer.writeBytes(ANSI_RESET)
      }
    }
  }
  
  /**
   * Generate commands for dirty regions only
   */
  private generateDirtyRegionCommands(regions: Bounds[]): void {
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
        
        let lineHasChanges = false
        
        // Check if this line in the region has any changes
        for (let x = region.x; x < region.x + region.width && x < this.container.width; x++) {
          const cell = row[x]
          const prevCell = prevRow?.[x]
          
          if (cell?.char !== prevCell?.char || 
              !this.stylesEqual(cell?.style, prevCell?.style)) {
            lineHasChanges = true
            break
          }
        }
        
        if (!lineHasChanges) continue
        
        // Find the range of actual changes
        let firstChange = -1
        let lastChange = -1
        
        for (let x = region.x; x < region.x + region.width && x < this.container.width; x++) {
          const cell = row[x]
          const prevCell = prevRow?.[x]
          
          if (cell?.char !== prevCell?.char || 
              !this.stylesEqual(cell?.style, prevCell?.style) ||
              (!cell && prevCell)) {
            if (firstChange === -1) firstChange = x
            lastChange = x
          }
        }
        
        if (firstChange === -1) continue
        
        // Move cursor to first change
        this.writer.writeCursorPosition(y + 1, firstChange + 1)
        
        // Render from first to last change
        for (let x = firstChange; x <= lastChange && x < this.container.width; x++) {
          const cell = row[x]
          
          if (cell && cell.char) {
            // Apply style if changed
            if (!this.stylesEqual(cell.style, currentStyle)) {
              if (currentStyle) {
                this.writer.writeBytes(ANSI_RESET)
              }
              if (cell.style) {
                this.writer.writeStyle(cell.style)
              }
              currentStyle = cell.style
            }
            
            this.writer.writeString(cell.char)
          } else {
            // Reset style before writing space
            if (currentStyle) {
              this.writer.writeBytes(ANSI_RESET)
              currentStyle = undefined
            }
            this.writer.writeString(' ')
          }
        }
      }
    }
    
    // Reset style
    if (currentStyle) {
      this.writer.writeBytes(ANSI_RESET)
    }
  }
  
  /**
   * Fast style comparison
   */
  private stylesEqual(a?: Style, b?: Style): boolean {
    if (a === b) return true
    if (!a || !b) return false
    
    return a.bold === b.bold &&
           a.dim === b.dim &&
           a.italic === b.italic &&
           a.underline === b.underline &&
           a.inverse === b.inverse &&
           a.strikethrough === b.strikethrough &&
           a.color === b.color &&
           a.backgroundColor === b.backgroundColor
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
      // Calculate content bounds for children
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
   * Render text element
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
    
    // Also collect from text node children
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
}

// Keep a map of containers to their renderers
const rendererMap = new WeakMap<TerminalContainer, BufferRenderer>()

/**
 * Render using zero-copy buffer
 */
export function renderWithBuffer(container: TerminalContainer): void {
  // Get or create renderer
  let renderer = rendererMap.get(container)
  
  if (!renderer) {
    renderer = new BufferRenderer(container)
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
  
  // Get the buffer
  const buffer = renderer.render()
  
  // Write to stream if we have output
  if (buffer.length > 0) {
    container.stream.write(buffer)
  }
}

/**
 * Get buffer renderer for performance metrics
 */
export function getBufferRenderer(container: TerminalContainer): BufferRenderer | undefined {
  return rendererMap.get(container)
}