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
    // Process all escape sequences in the output
    let remaining = output
    
    while (remaining) {
      // Handle cursor hide/show sequences
      if (remaining.startsWith('\x1b[?25l')) {
        remaining = remaining.slice(6)
        continue
      }
      if (remaining.startsWith('\x1b[?25h')) {
        remaining = remaining.slice(6)
        continue
      }
      
      // Handle other escape sequences
      const escIndex = remaining.indexOf('\x1b[')
      if (escIndex === -1) {
        // No more escape sequences, write remaining text
        if (remaining) {
          this.writeText(remaining)
        }
        break
      }
      
      // Write text before escape sequence
      if (escIndex > 0) {
        this.writeText(remaining.slice(0, escIndex))
        remaining = remaining.slice(escIndex)
      }
      
      // Find end of escape sequence
      const match = remaining.match(/^\x1b\[([^a-zA-Z]*)([a-zA-Z])/)
      if (!match) {
        // Invalid escape sequence, skip it
        remaining = remaining.slice(2)
        continue
      }
      
      const [fullMatch, params, command] = match
      this.handleEscapeSequence(params, command)
      remaining = remaining.slice(fullMatch.length)
    }
  }
  
  /**
   * Handle a single escape sequence
   */
  private handleEscapeSequence(params: string, command: string): void {
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
            if (this.cursorY < this.height && this.buffer[this.cursorY]) {
              this.buffer[this.cursorY][x] = ' '
            }
          }
        }
        break
        
      case 'm': // Style/color
        // For now, ignore styles
        break
        
      case 'A': // Cursor up
        const upCount = parseInt(params || '1', 10)
        this.cursorY = Math.max(0, this.cursorY - upCount)
        break
        
      case 'B': // Cursor down
        const downCount = parseInt(params || '1', 10)
        this.cursorY = Math.min(this.height - 1, this.cursorY + downCount)
        break
        
      case 'C': // Cursor forward
        const rightCount = parseInt(params || '1', 10)
        this.cursorX = Math.min(this.width - 1, this.cursorX + rightCount)
        break
        
      case 'D': // Cursor back
        const leftCount = parseInt(params || '1', 10)
        this.cursorX = Math.max(0, this.cursorX - leftCount)
        break
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