/**
 * Keyboard event management for terminal UI
 */

import { EventEmitter } from 'events'
import type { Readable } from 'stream'
import * as readline from 'readline'

export type KeyName = 
  | 'up' | 'down' | 'left' | 'right'
  | 'tab' | 'shift+tab'
  | 'enter' | 'space' | 'escape'
  | 'backspace' | 'delete'
  | 'home' | 'end'
  | 'pageup' | 'pagedown'
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'ctrl+a' | 'ctrl+c' | 'ctrl+d' | 'ctrl+e' | 'ctrl+f' | 'ctrl+g' | 'ctrl+h'
  | 'ctrl+i' | 'ctrl+j' | 'ctrl+k' | 'ctrl+l' | 'ctrl+m' | 'ctrl+n' | 'ctrl+o'
  | 'ctrl+p' | 'ctrl+q' | 'ctrl+r' | 'ctrl+s' | 'ctrl+t' | 'ctrl+u' | 'ctrl+v'
  | 'ctrl+w' | 'ctrl+x' | 'ctrl+y' | 'ctrl+z'

export interface KeyEvent {
  key: string
  name: KeyName | string
  ctrl: boolean
  meta: boolean
  shift: boolean
  sequence: string
}

export type KeyHandler = (event: KeyEvent) => void | boolean

export interface KeyBinding {
  key: KeyName | string
  handler: KeyHandler
  when?: () => boolean
}

export class KeyboardManager extends EventEmitter {
  private input: Readable
  private bindings = new Map<string, KeyBinding[]>()
  private isRaw = false
  private inputListener?: (data: Buffer) => void
  
  constructor(input: Readable = process.stdin) {
    super()
    this.input = input
  }
  
  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (this.isRaw) return
    
    // Set raw mode if available
    // Try different methods to enable raw mode
    let rawModeEnabled = false
    
    // Method 1: Try process.stdin.setRawMode
    if ('setRawMode' in process.stdin && typeof (process.stdin as any).setRawMode === 'function') {
      try {
        (process.stdin as any).setRawMode(true)
        this.isRaw = true
        rawModeEnabled = true
      } catch (err) {
        // Silent fail
      }
    }
    
    // Method 2: Try input.setRawMode
    if (!rawModeEnabled && (this.input as any).isTTY && 'setRawMode' in this.input) {
      try {
        (this.input as any).setRawMode(true)
        this.isRaw = true
        rawModeEnabled = true
      } catch (err) {
        // Silent fail
      }
    }
    
    // Method 3: For Bun, try to access the underlying fd
    if (!rawModeEnabled && 'fd' in this.input) {
      try {
        // In Bun, we might need to use the file descriptor directly
        const tty = require('tty')
        if (tty.isatty((this.input as any).fd)) {
          const stream = new tty.ReadStream((this.input as any).fd)
          stream.setRawMode(true)
          this.isRaw = true
          rawModeEnabled = true
        }
      } catch (err) {
        // Silent fail
      }
    }
    
    // If raw mode is not enabled, keyboard events might still work
    // but arrow keys might not be properly captured
    
    // Resume input
    this.input.resume()
    
    // Listen for data
    this.inputListener = (data: Buffer) => {
      const key = this.parseKey(data)
      if (key) {
        this.handleKey(key)
      }
    }
    
    this.input.on('data', this.inputListener)
  }
  
  /**
   * Stop listening for keyboard events
   */
  stop(): void {
    if (!this.isRaw) return
    
    // Remove listener
    if (this.inputListener) {
      this.input.off('data', this.inputListener)
      this.inputListener = undefined
    }
    
    // Restore terminal
    if ((this.input as any).isTTY && 'setRawMode' in this.input) {
      (this.input as any).setRawMode(false)
      this.isRaw = false
    }
    
    // Pause input
    this.input.pause()
  }
  
  /**
   * Add a key binding
   */
  bind(key: KeyName | string, handler: KeyHandler, when?: () => boolean): void {
    const binding: KeyBinding = { key, handler, when }
    const bindings = this.bindings.get(key) || []
    bindings.push(binding)
    this.bindings.set(key, bindings)
  }
  
  /**
   * Remove a key binding
   */
  unbind(key: KeyName | string, handler?: KeyHandler): void {
    if (!handler) {
      this.bindings.delete(key)
    } else {
      const bindings = this.bindings.get(key)
      if (bindings) {
        const filtered = bindings.filter(b => b.handler !== handler)
        if (filtered.length > 0) {
          this.bindings.set(key, filtered)
        } else {
          this.bindings.delete(key)
        }
      }
    }
  }
  
  /**
   * Handle a key event
   */
  private handleKey(event: KeyEvent): void {
    // Emit raw event
    this.emit('key', event)
    
    // Check bindings
    const bindings = this.bindings.get(event.name)
    if (bindings) {
      for (const binding of bindings) {
        // Check condition
        if (binding.when && !binding.when()) {
          continue
        }
        
        // Call handler
        const handled = binding.handler(event)
        if (handled !== false) {
          break // Stop if handler didn't return false
        }
      }
    }
  }
  
  /**
   * Parse key from input data
   */
  private parseKey(data: Buffer): KeyEvent | null {
    const sequence = data.toString()
    const key = sequence
    
    // Control sequences
    if (data[0] === 0x1b) { // ESC
      if (data.length === 1) {
        return { key, name: 'escape', ctrl: false, meta: false, shift: false, sequence }
      }
      
      // Arrow keys
      if (data[1] === 0x5b) { // [
        switch (data[2]) {
          case 0x41: return { key, name: 'up', ctrl: false, meta: false, shift: false, sequence }
          case 0x42: return { key, name: 'down', ctrl: false, meta: false, shift: false, sequence }
          case 0x43: return { key, name: 'right', ctrl: false, meta: false, shift: false, sequence }
          case 0x44: return { key, name: 'left', ctrl: false, meta: false, shift: false, sequence }
          case 0x48: return { key, name: 'home', ctrl: false, meta: false, shift: false, sequence }
          case 0x46: return { key, name: 'end', ctrl: false, meta: false, shift: false, sequence }
          case 0x35: return { key, name: 'pageup', ctrl: false, meta: false, shift: false, sequence }
          case 0x36: return { key, name: 'pagedown', ctrl: false, meta: false, shift: false, sequence }
          case 0x33: return { key, name: 'delete', ctrl: false, meta: false, shift: false, sequence }
        }
        
        // Shift+Tab
        if (data[2] === 0x5a) {
          return { key, name: 'shift+tab', ctrl: false, meta: false, shift: true, sequence }
        }
      }
    }
    
    // Tab
    if (data[0] === 0x09) {
      return { key, name: 'tab', ctrl: false, meta: false, shift: false, sequence }
    }
    
    // Enter
    if (data[0] === 0x0d) {
      return { key, name: 'enter', ctrl: false, meta: false, shift: false, sequence }
    }
    
    // Space
    if (data[0] === 0x20) {
      return { key, name: 'space', ctrl: false, meta: false, shift: false, sequence }
    }
    
    // Backspace
    if (data[0] === 0x7f || data[0] === 0x08) {
      return { key, name: 'backspace', ctrl: false, meta: false, shift: false, sequence }
    }
    
    // Ctrl+letter
    const firstByte = data[0]
    if (firstByte !== undefined && firstByte >= 0x01 && firstByte <= 0x1a) {
      const letter = String.fromCharCode(firstByte + 96)
      
      // Special handling for Ctrl+C
      if (letter === 'c') {
        // Emit the event but don't prevent default handling
        this.emit('key', { 
          key, 
          name: 'ctrl+c', 
          ctrl: true, 
          meta: false, 
          shift: false, 
          sequence 
        })
        
        // Let the process handle Ctrl+C normally
        process.emit('SIGINT', 'SIGINT')
        return null
      }
      
      return { 
        key, 
        name: `ctrl+${letter}`, 
        ctrl: true, 
        meta: false, 
        shift: false, 
        sequence 
      }
    }
    
    // Regular characters
    if (data.length === 1 && data[0] !== undefined) {
      const char = String.fromCharCode(data[0])
      if (/^[a-z0-9]$/i.test(char)) {
        return { 
          key: char, 
          name: char.toLowerCase(), 
          ctrl: false, 
          meta: false, 
          shift: char !== char.toLowerCase(), 
          sequence 
        }
      }
    }
    
    // Unknown sequence
    return { 
      key, 
      name: sequence, 
      ctrl: false, 
      meta: false, 
      shift: false, 
      sequence 
    }
  }
}

// Global keyboard manager instance
export const keyboardManager = new KeyboardManager()