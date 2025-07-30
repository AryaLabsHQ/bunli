import { Component } from './base/Component.js'
import type { ParsedKey } from '@opentui/core'
import type { ComponentOptions } from '../types.js'

export interface NumberInputOptions extends ComponentOptions {
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  placeholder?: string
}

export class NumberInput extends Component {
  private value: string = ''
  private cursorPosition: number = 0
  private min?: number
  private max?: number
  private step: number
  private placeholder: string
  
  constructor(options: NumberInputOptions) {
    super({
      ...options,
      height: 4
    })
    
    this.min = options.min
    this.max = options.max
    this.step = options.step || 1
    this.placeholder = options.placeholder || '0'
    
    if (options.defaultValue !== undefined) {
      this.setValue(options.defaultValue)
    }
  }
  
  getValue(): number | null {
    const num = parseFloat(this.value)
    return isNaN(num) ? null : num
  }
  
  setValue(value: number | null): void {
    this.value = value !== null ? String(value) : ''
    this.cursorPosition = this.value.length
    this.needsRefresh = true
  }
  
  validate(): boolean {
    this.clearError()
    
    const num = this.getValue()
    
    // Required validation
    if (this.required && num === null) {
      this.setError(`${this.label} is required`)
      return false
    }
    
    // Skip range validation if not required and empty
    if (!this.required && num === null) {
      return true
    }
    
    // Range validation
    if (num !== null) {
      if (this.min !== undefined && num < this.min) {
        this.setError(`${this.label} must be at least ${this.min}`)
        return false
      }
      
      if (this.max !== undefined && num > this.max) {
        this.setError(`${this.label} must be at most ${this.max}`)
        return false
      }
    }
    
    // Custom validator
    if (this.validator) {
      const error = this.validator(num)
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
          this.clearError()
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
        
      case 'up':
        this.increment()
        return true
        
      case 'down':
        this.decrement()
        return true
        
      case 'home':
        this.cursorPosition = 0
        this.needsRefresh = true
        return true
        
      case 'end':
        this.cursorPosition = this.value.length
        this.needsRefresh = true
        return true
        
      default:
        // Allow digits, decimal point, and minus sign
        if (key.name.length === 1 && !key.ctrl && !key.meta) {
          const char = key.name
          if (/[0-9.\-]/.test(char)) {
            // Prevent multiple decimal points
            if (char === '.' && this.value.includes('.')) {
              return true
            }
            
            // Only allow minus at start
            if (char === '-' && this.cursorPosition !== 0) {
              return true
            }
            
            this.value = 
              this.value.slice(0, this.cursorPosition) + 
              char + 
              this.value.slice(this.cursorPosition)
            this.cursorPosition++
            this.needsRefresh = true
            this.clearError()
          }
          return true
        }
    }
    
    return false
  }
  
  private increment(): void {
    const current = this.getValue() || 0
    const newValue = current + this.step
    
    if (this.max === undefined || newValue <= this.max) {
      this.setValue(newValue)
      this.clearError()
    }
  }
  
  private decrement(): void {
    const current = this.getValue() || 0
    const newValue = current - this.step
    
    if (this.min === undefined || newValue >= this.min) {
      this.setValue(newValue)
      this.clearError()
    }
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
    const inputHeight = 3
    
    // Background
    this.frameBuffer.fillRect(
      x, inputY, width, inputHeight,
      this.backgroundColor
    )
    
    // Border
    const borderColor = this.error 
      ? this.errorColor 
      : (this.focused ? this.focusedBorderColor : this.borderColor)
    
    this.frameBuffer.drawText('─'.repeat(width), x, inputY, borderColor)
    this.frameBuffer.drawText('─'.repeat(width), x, inputY + inputHeight - 1, borderColor)
    for (let i = 0; i < inputHeight; i++) {
      this.frameBuffer.drawText('│', x, inputY + i, borderColor)
      this.frameBuffer.drawText('│', x + width - 1, inputY + i, borderColor)
    }
    this.frameBuffer.drawText('┌', x, inputY, borderColor)
    this.frameBuffer.drawText('┐', x + width - 1, inputY, borderColor)
    this.frameBuffer.drawText('└', x, inputY + inputHeight - 1, borderColor)
    this.frameBuffer.drawText('┘', x + width - 1, inputY + inputHeight - 1, borderColor)
    
    // Draw value or placeholder
    const textToShow = this.value || this.placeholder
    const textColor = this.value ? this.textColor : this.placeholderColor
    
    this.frameBuffer.drawText(
      textToShow,
      x + 1, inputY + 1,
      textColor
    )
    
    // Draw cursor if focused
    if (this.focused) {
      const cursorX = x + 1 + this.cursorPosition
      if (cursorX < x + width - 1) {
        this.frameBuffer.drawText('│', cursorX, inputY + 1, this.focusedBorderColor)
      }
    }
    
    // Draw up/down indicators if focused
    if (this.focused) {
      this.frameBuffer.drawText('▲', x + width - 2, inputY, borderColor)
      this.frameBuffer.drawText('▼', x + width - 2, inputY + 2, borderColor)
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