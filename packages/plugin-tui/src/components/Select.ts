import { Component } from './base/Component.js'
import type { ParsedKey } from '@opentui/core'
import type { ComponentOptions } from '../types.js'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectOptions extends ComponentOptions {
  options: SelectOption[]
  defaultValue?: string
  placeholder?: string
}

export class Select extends Component {
  private options: SelectOption[]
  private selectedIndex: number = -1
  private isOpen: boolean = false
  private placeholder: string
  
  constructor(options: SelectOptions) {
    super({
      ...options,
      height: 4 // Base height, expands when open
    })
    
    this.options = options.options || []
    this.placeholder = options.placeholder || 'Select an option...'
    
    if (options.defaultValue !== undefined) {
      const index = this.options.findIndex(opt => opt.value === options.defaultValue)
      if (index >= 0) {
        this.selectedIndex = index
      }
    }
  }
  
  getValue(): string | null {
    return this.selectedIndex >= 0 ? this.options[this.selectedIndex].value : null
  }
  
  setValue(value: string | null): void {
    if (value === null) {
      this.selectedIndex = -1
    } else {
      const index = this.options.findIndex(opt => opt.value === value)
      this.selectedIndex = index
    }
    this.needsRefresh = true
  }
  
  validate(): boolean {
    this.clearError()
    
    if (this.required && this.selectedIndex < 0) {
      this.setError(`${this.label} is required`)
      return false
    }
    
    if (this.validator) {
      const value = this.getValue()
      const error = this.validator(value)
      if (error) {
        this.setError(error)
        return false
      }
    }
    
    return true
  }
  
  protected handleKeyPressInternal(key: ParsedKey): boolean {
    if (!this.isOpen) {
      // Closed state
      switch (key.name) {
        case 'space':
        case 'enter':
        case 'down':
          this.isOpen = true
          this.needsRefresh = true
          // Update height when opening
          this.height = Math.min(4 + this.options.length + 1, 10)
          return true
      }
    } else {
      // Open state
      switch (key.name) {
        case 'escape':
          this.isOpen = false
          this.height = 4 // Reset height
          this.needsRefresh = true
          return true
          
        case 'enter':
        case 'space':
          this.isOpen = false
          this.height = 4 // Reset height
          this.needsRefresh = true
          this.clearError()
          return true
          
        case 'up':
          if (this.selectedIndex > 0) {
            this.selectedIndex--
            this.needsRefresh = true
          }
          return true
          
        case 'down':
          if (this.selectedIndex < this.options.length - 1) {
            this.selectedIndex++
            this.needsRefresh = true
          }
          return true
      }
    }
    
    return false
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
    
    // Draw select box
    const selectY = y + 1
    const selectHeight = this.isOpen ? Math.min(this.options.length + 1, 7) : 3
    
    // Background
    this.frameBuffer.fillRect(
      x, selectY, width, selectHeight,
      this.backgroundColor
    )
    
    // Border
    const borderColor = this.error 
      ? this.errorColor 
      : (this.focused ? this.focusedBorderColor : this.borderColor)
    
    // Draw border
    this.frameBuffer.drawText('─'.repeat(width), x, selectY, borderColor)
    this.frameBuffer.drawText('─'.repeat(width), x, selectY + selectHeight - 1, borderColor)
    for (let i = 0; i < selectHeight; i++) {
      this.frameBuffer.drawText('│', x, selectY + i, borderColor)
      this.frameBuffer.drawText('│', x + width - 1, selectY + i, borderColor)
    }
    this.frameBuffer.drawText('┌', x, selectY, borderColor)
    this.frameBuffer.drawText('┐', x + width - 1, selectY, borderColor)
    this.frameBuffer.drawText('└', x, selectY + selectHeight - 1, borderColor)
    this.frameBuffer.drawText('┘', x + width - 1, selectY + selectHeight - 1, borderColor)
    
    if (!this.isOpen) {
      // Closed - show selected value or placeholder
      const displayText = this.selectedIndex >= 0 
        ? this.options[this.selectedIndex].label 
        : this.placeholder
      
      const textColor = this.selectedIndex >= 0 
        ? this.textColor 
        : this.placeholderColor
      
      this.frameBuffer.drawText(
        displayText.slice(0, width - 4),
        x + 1, selectY + 1,
        textColor
      )
      
      // Draw dropdown arrow
      this.frameBuffer.drawText('▼', x + width - 2, selectY + 1, borderColor)
    } else {
      // Open - show options
      this.options.forEach((option, index) => {
        if (index < selectHeight - 2) {
          const isSelected = index === this.selectedIndex
          const optionY = selectY + 1 + index
          
          // Highlight selected option
          if (isSelected) {
            this.frameBuffer.fillRect(
              x + 1, optionY, width - 2, 1,
              this.focusedBorderColor
            )
          }
          
          this.frameBuffer.drawText(
            option.label.slice(0, width - 2),
            x + 1, optionY,
            isSelected ? this.backgroundColor : this.textColor
          )
        }
      })
    }
    
    // Draw error if present and select is closed
    if (this.error && !this.isOpen) {
      this.frameBuffer.drawText(
        `⚠ ${this.error}`,
        x, selectY + selectHeight,
        this.errorColor
      )
    }
  }
}