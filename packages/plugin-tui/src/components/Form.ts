import { ContainerElement, FlexDirection, type ParsedKey, RGBA } from '@opentui/core'
import { Component } from './base/Component.js'
import { Button } from './Button.js'
import { resolveColor } from '../utils/theme.js'

export interface FormOptions {
  id: string
  title: string
  description?: string
}

export class Form extends ContainerElement {
  private fields: Component[] = []
  private submitButton: Button
  private cancelButton: Button
  private focusedIndex: number = 0
  private submitPromise?: {
    resolve: (values: any) => void
    reject: (error: Error) => void
  }
  
  constructor(options: FormOptions) {
    super(options.id, {
      width: '80%',
      height: '90%',
      flexDirection: FlexDirection.Column,
      border: true,
      borderStyle: 'double',
      title: options.title,
      backgroundColor: '#1e293b',
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      positionType: 'absolute',
      position: {
        top: '5%',
        left: '10%'
      }
    })
    
    this.setupUI(options)
  }
  
  private setupUI(options: FormOptions) {
    // Add description if provided
    if (options.description) {
      // TODO: Add description text element when text component is available
    }
    
    // Create field container with scrolling
    const fieldContainer = new ContainerElement('field-container', {
      flexDirection: FlexDirection.Column,
      flexGrow: 1,
      flexShrink: 1,
      padding: { top: 1, bottom: 1 }
    })
    this.add(fieldContainer)
    
    // Create buttons
    this.submitButton = new Button({
      id: 'submit',
      text: 'Submit',
      variant: 'primary',
      onPress: () => this.handleSubmit()
    })
    
    this.cancelButton = new Button({
      id: 'cancel',
      text: 'Cancel',
      variant: 'secondary',
      onPress: () => this.handleCancel()
    })
    
    // Add button container at the bottom
    const buttonContainer = new ContainerElement('buttons', {
      flexDirection: FlexDirection.Row,
      justifyContent: 'flex-end',
      height: 3,
      padding: { top: 1 },
      borderStyle: 'single',
      border: ['top']
    })
    
    buttonContainer.add(this.cancelButton)
    buttonContainer.add(this.submitButton)
    this.add(buttonContainer)
  }
  
  public addField(field: Component): void {
    this.fields.push(field)
    
    // Add to field container
    const fieldContainer = this.getRenderable('field-container')
    if (fieldContainer) {
      fieldContainer.add(field)
    }
    
    // Auto-focus first field
    if (this.fields.length === 1) {
      this.focusedIndex = 0
      this.updateFocus()
    }
  }
  
  public async waitForSubmit(): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      this.submitPromise = { resolve, reject }
      this.focus()
      this.updateFocus()
    })
  }
  
  private handleSubmit(): void {
    // Validate all fields
    let hasErrors = false
    for (const field of this.fields) {
      if (!field.validate()) {
        hasErrors = true
      }
    }
    
    if (hasErrors) {
      // Focus first field with error
      const errorIndex = this.fields.findIndex(f => f.getError() !== null)
      if (errorIndex >= 0) {
        this.focusedIndex = errorIndex
        this.updateFocus()
      }
      return
    }
    
    // Collect values
    const values: Record<string, any> = {}
    for (const field of this.fields) {
      values[field.name] = field.getValue()
    }
    
    // Resolve promise
    if (this.submitPromise) {
      this.submitPromise.resolve(values)
      this.submitPromise = undefined
    }
  }
  
  private handleCancel(): void {
    if (this.submitPromise) {
      this.submitPromise.reject(new Error('Form cancelled'))
      this.submitPromise = undefined
    }
  }
  
  public handleKeyPress(key: ParsedKey): boolean {
    switch (key.name) {
      case 'tab':
        if (key.shift) {
          // Move focus to previous field
          this.focusedIndex = this.focusedIndex > 0 
            ? this.focusedIndex - 1 
            : this.fields.length + 1 // Go to cancel button
        } else {
          // Move focus to next field
          this.focusedIndex = (this.focusedIndex + 1) % (this.fields.length + 2)
        }
        this.updateFocus()
        return true
        
      case 'escape':
        this.handleCancel()
        return true
        
      case 'enter':
        // Submit if on submit button
        if (this.focusedIndex === this.fields.length) {
          this.handleSubmit()
          return true
        }
        break
        
      default:
        // Pass to focused component
        const focused = this.getFocusedComponent()
        if (focused && 'handleKeyPress' in focused) {
          return focused.handleKeyPress(key)
        }
    }
    
    return false
  }
  
  private updateFocus(): void {
    // Clear all focus
    this.fields.forEach(f => f.blur())
    this.submitButton.blur()
    this.cancelButton.blur()
    
    // Set new focus
    if (this.focusedIndex < this.fields.length) {
      this.fields[this.focusedIndex].focus()
    } else if (this.focusedIndex === this.fields.length) {
      this.submitButton.focus()
    } else {
      this.cancelButton.focus()
    }
  }
  
  private getFocusedComponent(): Component | Button | null {
    if (this.focusedIndex < this.fields.length) {
      return this.fields[this.focusedIndex]
    } else if (this.focusedIndex === this.fields.length) {
      return this.submitButton
    } else if (this.focusedIndex === this.fields.length + 1) {
      return this.cancelButton
    }
    return null
  }
  
  protected refreshContent(contentX: number, contentY: number, contentWidth: number, contentHeight: number): void {
    // Form background is handled by base class
    // We just need to ensure proper layout
  }
}