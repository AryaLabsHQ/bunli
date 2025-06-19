/**
 * Mock terminal implementation for testing
 */

import type { Bounds } from '../../src/types.js'

export interface TerminalUpdate {
  x: number
  y: number
  content: string
  style?: any
}

export class MockTerminal {
  private buffer: string[][]
  private cursorX = 0
  private cursorY = 0
  private updates: TerminalUpdate[] = []
  private output: string[] = []
  
  constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    this.buffer = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    )
  }
  
  /**
   * Write output to the terminal
   */
  write(output: string): void {
    this.output.push(output)
    this.parseANSI(output)
  }
  
  /**
   * Parse ANSI escape sequences and update buffer
   */
  private parseANSI(output: string): void {
    // Handle special sequences first
    if (output.startsWith('\x1b[?25l')) {
      // Hide cursor - ignore
      return
    }
    if (output.startsWith('\x1b[?25h')) {
      // Show cursor - ignore
      return
    }
    
    // Handle sequences without escape character first
    if (output.startsWith('[')) {
      output = '\x1b' + output
    }
    
    // Split by ANSI escape sequences
    const parts = output.split(/\x1b\[/)
    
    for (let i = 0; i < parts.length; i++) {
      if (i === 0 && parts[i]) {
        // Regular text before first escape sequence
        this.writeText(parts[i])
        continue
      }
      
      const part = parts[i]
      if (!part) continue
      
      // Parse escape sequence
      const match = part.match(/^([0-9;]*)([A-Za-z])(.*)$/)
      if (!match) {
        this.writeText(part)
        continue
      }
      
      const [, params, command, text] = match
      
      switch (command) {
        case 'H': // Cursor position
          const [row, col] = params.split(';').map(n => parseInt(n || '1', 10))
          this.cursorY = row - 1
          this.cursorX = col - 1
          break
          
        case 'J': // Clear screen
          if (params === '2') {
            this.clear()
          }
          break
          
        case 'K': // Clear line
          if (params === '' || params === '0' || params === '2') {
            // Clear from cursor to end of line (or entire line if 2)
            const startX = params === '2' ? 0 : this.cursorX
            for (let x = startX; x < this.width; x++) {
              if (this.cursorY < this.height) {
                this.buffer[this.cursorY][x] = ' '
              }
            }
          }
          break
          
        case 'm': // Style/color
          // For now, ignore styles
          break
      }
      
      // Write any text after the command
      if (text) {
        this.writeText(text)
      }
    }
  }
  
  /**
   * Write text at current cursor position
   */
  private writeText(text: string): void {
    for (const char of text) {
      if (char === '\n') {
        this.cursorY++
        this.cursorX = 0
        continue
      }
      
      if (char === '\r') {
        this.cursorX = 0
        continue
      }
      
      if (this.cursorY < this.height && this.cursorX < this.width) {
        this.buffer[this.cursorY][this.cursorX] = char
        this.updates.push({
          x: this.cursorX,
          y: this.cursorY,
          content: char
        })
        this.cursorX++
      }
    }
  }
  
  /**
   * Clear the terminal
   */
  clear(): void {
    this.buffer = Array(this.height).fill(null).map(() => 
      Array(this.width).fill(' ')
    )
    this.cursorX = 0
    this.cursorY = 0
    this.updates = []
  }
  
  /**
   * Reset the terminal state
   */
  reset(): void {
    this.clear()
    this.output = []
  }
  
  /**
   * Resize the terminal
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    
    // Resize buffer, preserving existing content where possible
    const newBuffer = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    )
    
    // Copy existing content
    for (let y = 0; y < Math.min(height, this.buffer.length); y++) {
      for (let x = 0; x < Math.min(width, this.buffer[y]?.length || 0); x++) {
        newBuffer[y][x] = this.buffer[y][x]
      }
    }
    
    this.buffer = newBuffer
  }
  
  /**
   * Get the rendered content as a string
   */
  getRenderedContent(): string {
    return this.buffer
      .map(row => row.join('').trimEnd())
      .join('\n')
      .trimEnd()
  }
  
  /**
   * Get the raw ANSI output (for snapshot testing)
   */
  getRawOutput(): string {
    return this.output.join('')
  }
  
  /**
   * Get a region of the buffer
   */
  getRegion(bounds: Bounds): string[][] {
    const result: string[][] = []
    
    for (let y = bounds.y; y < bounds.y + bounds.height && y < this.height; y++) {
      const row: string[] = []
      for (let x = bounds.x; x < bounds.x + bounds.width && x < this.width; x++) {
        row.push(this.buffer[y]?.[x] || ' ')
      }
      result.push(row)
    }
    
    return result
  }
  
  /**
   * Get cursor position
   */
  getCursorPosition(): { x: number; y: number } {
    return { x: this.cursorX, y: this.cursorY }
  }
  
  /**
   * Get the last updates made to the terminal
   */
  getLastUpdates(): TerminalUpdate[] {
    return [...this.updates]
  }
  
  /**
   * Get raw output as array
   */
  getRawOutputArray(): string[] {
    return [...this.output]
  }
  
  /**
   * Count the number of updates in a region
   */
  countUpdatesInRegion(bounds: Bounds): number {
    return this.updates.filter(update =>
      update.x >= bounds.x &&
      update.x < bounds.x + bounds.width &&
      update.y >= bounds.y &&
      update.y < bounds.y + bounds.height
    ).length
  }
}