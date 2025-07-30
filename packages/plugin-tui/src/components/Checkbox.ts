import { Component } from './base/Component.js'
import type { ParsedKey } from '@opentui/core'
import type { ComponentOptions } from '../types.js'

export interface CheckboxOptions extends ComponentOptions {
  defaultValue?: boolean
}

export class Checkbox extends Component {
  private checked: boolean = false
  
  constructor(options: CheckboxOptions) {
    super({
      ...options,
      height: 3 // Simpler layout for checkbox
    })
    
    if (options.defaultValue !== undefined) {
      this.checked = Boolean(options.defaultValue)
    }
  }
  
  getValue(): boolean {
    return this.checked
  }
  
  setValue(value: boolean): void {
    this.checked = Boolean(value)
    this.needsRefresh = true
  }
  
  validate(): boolean {
    // Checkboxes typically don't have validation
    // unless you need to ensure it's checked
    this.clearError()
    
    if (this.validator) {
      const error = this.validator(this.checked)
      if (error) {
        this.setError(error)
        return false
      }
    }
    
    return true
  }
  
  protected handleKeyPressInternal(key: ParsedKey): boolean {
    if (key.name === 'space' || key.name === 'enter') {
      this.checked = !this.checked
      this.needsRefresh = true
      this.clearError()
      return true
    }
    
    return false
  }
  
  protected refreshContent(x: number, y: number, width: number, height: number): void {
    if (!this.frameBuffer) return
    
    // Draw checkbox and label on same line
    const checkboxChar = this.checked ? '☑' : '☐'
    const labelText = this.label + (this.required ? ' *' : '')
    
    const lineY = y + 1 // Center vertically in 3-height area
    
    // Draw checkbox
    this.frameBuffer.drawText(
      checkboxChar,
      x,
      lineY,
      this.focused ? this.focusedBorderColor : this.textColor
    )
    
    // Draw label
    this.frameBuffer.drawText(
      labelText,
      x + 3,
      lineY,
      this.focused ? this.focusedBorderColor : this.textColor
    )
    
    // Draw focus indicator
    if (this.focused) {
      this.frameBuffer.drawText('▶', x - 2, lineY, this.focusedBorderColor)
    }
    
    // Draw error if present
    if (this.error) {
      this.frameBuffer.drawText(
        `⚠ ${this.error}`,
        x,
        lineY + 1,
        this.errorColor
      )
    }
  }
}