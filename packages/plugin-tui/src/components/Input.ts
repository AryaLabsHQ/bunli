import { Component } from './base/Component.js'
import type { ParsedKey } from '@opentui/core'
import type { ComponentOptions } from '../types.js'

export interface InputOptions extends ComponentOptions {
  placeholder?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  password?: boolean
  multiline?: boolean
}

export class Input extends Component {
  private value: string = ''
  private cursorPosition: number = 0
  private placeholder: string
  private maxLength?: number
  private minLength?: number
  private pattern?: RegExp
  private password: boolean
  private multiline: boolean
  
  constructor(options: InputOptions) {
    super({
      ...options,
      height: options.multiline ? 5 : 4 // Label + input box + potential error
    })
    
    this.placeholder = options.placeholder || ''
    this.maxLength = options.maxLength
    this.minLength = options.minLength
    this.password = options.password || false
    this.multiline = options.multiline || false
    
    if (options.pattern) {
      this.pattern = new RegExp(options.pattern)
    }
  }
  
  getValue(): string {
    return this.value
  }
  
  setValue(value: string): void {
    this.value = String(value || '')
    this.cursorPosition = this.value.length
    this.needsRefresh = true
  }
  
  validate(): boolean {
    this.clearError()
    
    // Required validation
    if (this.required && !this.value.trim()) {
      this.setError(`${this.label} is required`)
      return false
    }
    
    // Length validation
    if (this.minLength && this.value.length < this.minLength) {
      this.setError(`${this.label} must be at least ${this.minLength} characters`)
      return false
    }
    
    if (this.maxLength && this.value.length > this.maxLength) {
      this.setError(`${this.label} must be ${this.maxLength} characters or less`)
      return false
    }
    
    // Pattern validation
    if (this.pattern && this.value && !this.pattern.test(this.value)) {
      this.setError(`${this.label} format is invalid`)
      return false
    }
    
    // Custom validator
    if (this.validator) {
      const error = this.validator(this.value)
      if (error) {
        this.setError(error)
        return false
      }
    }
    
    return true
  }
  
  protected handleKeyPressInternal(key: ParsedKey): boolean {
    switch (key.name) {
      case 'backspace':
        if (this.cursorPosition > 0) {
          this.value = 
            this.value.slice(0, this.cursorPosition - 1) + 
            this.value.slice(this.cursorPosition)
          this.cursorPosition--
          this.needsRefresh = true
          this.clearError() // Clear error on edit
        }
        return true
        
      case 'delete':
        if (this.cursorPosition < this.value.length) {
          this.value = 
            this.value.slice(0, this.cursorPosition) + 
            this.value.slice(this.cursorPosition + 1)
          this.needsRefresh = true
          this.clearError()
        }
        return true
        
      case 'left':
        if (this.cursorPosition > 0) {
          this.cursorPosition--
          this.needsRefresh = true
        }
        return true
        
      case 'right':
        if (this.cursorPosition < this.value.length) {
          this.cursorPosition++
          this.needsRefresh = true
        }
        return true
        
      case 'home':
        this.cursorPosition = 0
        this.needsRefresh = true
        return true
        
      case 'end':
        this.cursorPosition = this.value.length
        this.needsRefresh = true
        return true
        
      case 'enter':
        if (this.multiline) {
          // Add newline in multiline mode
          this.insertText('\n')
          return true
        }
        // In single-line mode, enter submits the form
        return false
        
      default:
        // Handle character input
        if (key.name.length === 1 && !key.ctrl && !key.meta) {
          this.insertText(key.name)
          return true
        }
    }
    
    return false
  }
  
  private insertText(text: string): void {
    if (this.maxLength && this.value.length + text.length > this.maxLength) {
      return
    }
    
    this.value = 
      this.value.slice(0, this.cursorPosition) + 
      text + 
      this.value.slice(this.cursorPosition)
    this.cursorPosition += text.length
    this.needsRefresh = true
    this.clearError()
  }
  
  protected refreshContent(x: number, y: number, width: number, height: number): void {
    if (!this.frameBuffer) return
    
    // Draw label
    const labelText = this.label + (this.required ? ' *' : '')
    this.frameBuffer.drawText(
      labelText,
      x, y,
      this.focused ? this.focusedBorderColor : this.textColor
    )
    
    // Draw input box
    const inputY = y + 1
    const inputHeight = this.multiline ? height - 2 : 3
    
    // Input background
    const inputBg = this.focused 
      ? this.backgroundColor // Keep same color when focused
      : this.backgroundColor
    
    this.frameBuffer.fillRect(
      x, inputY, width, inputHeight,
      inputBg
    )
    
    // Draw border
    if (this.border) {
      const borderColor = this.error 
        ? this.errorColor 
        : (this.focused ? this.focusedBorderColor : this.borderColor)
      
      // Top border
      this.frameBuffer.drawText('─'.repeat(width), x, inputY, borderColor)
      // Bottom border
      this.frameBuffer.drawText('─'.repeat(width), x, inputY + inputHeight - 1, borderColor)
      // Left border
      for (let i = 0; i < inputHeight; i++) {
        this.frameBuffer.drawText('│', x, inputY + i, borderColor)
      }
      // Right border
      for (let i = 0; i < inputHeight; i++) {
        this.frameBuffer.drawText('│', x + width - 1, inputY + i, borderColor)
      }
      // Corners
      this.frameBuffer.drawText('┌', x, inputY, borderColor)
      this.frameBuffer.drawText('┐', x + width - 1, inputY, borderColor)
      this.frameBuffer.drawText('└', x, inputY + inputHeight - 1, borderColor)
      this.frameBuffer.drawText('┘', x + width - 1, inputY + inputHeight - 1, borderColor)
    }
    
    // Draw value or placeholder
    const displayValue = this.password ? '*'.repeat(this.value.length) : this.value
    const textToShow = displayValue || this.placeholder
    const textColor = displayValue ? this.textColor : this.placeholderColor
    
    if (this.multiline) {
      // Handle multiline text
      const lines = textToShow.split('\n')
      lines.forEach((line, index) => {
        if (index < inputHeight - 2) {
          this.frameBuffer!.drawText(
            line.slice(0, width - 2),
            x + 1, inputY + 1 + index,
            textColor
          )
        }
      })
    } else {
      // Single line - handle scrolling if text is too long
      const visibleWidth = width - 2
      let visibleText = textToShow
      let visibleCursorPos = this.cursorPosition
      
      if (textToShow.length > visibleWidth) {
        // Scroll text to keep cursor visible
        const scrollOffset = Math.max(0, this.cursorPosition - visibleWidth + 1)
        visibleText = textToShow.slice(scrollOffset, scrollOffset + visibleWidth)
        visibleCursorPos = this.cursorPosition - scrollOffset
      }
      
      this.frameBuffer.drawText(
        visibleText,
        x + 1, inputY + 1,
        textColor
      )
      
      // Draw cursor if focused
      if (this.focused && visibleCursorPos >= 0 && visibleCursorPos <= visibleWidth) {
        this.frameBuffer.drawText('│', x + 1 + visibleCursorPos, inputY + 1, this.focusedBorderColor)
      }
    }
    
    // Draw error if present
    if (this.error) {
      this.frameBuffer.drawText(
        `⚠ ${this.error}`,
        x, inputY + inputHeight,
        this.errorColor
      )
    }
  }
}