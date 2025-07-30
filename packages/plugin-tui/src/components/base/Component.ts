import { BufferedElement, type ElementOptions, type ParsedKey, RGBA } from '@opentui/core'
import type { ComponentOptions } from '../../types.js'
import { resolveColor } from '../../utils/theme.js'

export abstract class Component extends BufferedElement {
  protected name: string
  protected label: string
  protected required: boolean
  protected disabled: boolean
  protected error: string | null = null
  protected validator?: (value: any) => string | null
  
  // Theme colors
  protected errorColor: RGBA
  protected successColor: RGBA
  protected focusedBorderColor: RGBA
  protected placeholderColor: RGBA
  
  constructor(options: ComponentOptions) {
    const elementOptions: ElementOptions = {
      x: options.x || 0,
      y: options.y || 0,
      zIndex: 0,
      width: typeof options.width === 'string' ? options.width as any : (options.width || 0),
      height: typeof options.height === 'string' ? options.height as any : (options.height || 0),
      visible: options.visible !== false,
      backgroundColor: options.style?.backgroundColor || 'transparent',
      textColor: options.style?.color || '#f1f5f9',
      borderColor: options.style?.borderColor || '#475569',
      borderStyle: (options.style?.borderStyle === 'none' ? undefined : options.style?.borderStyle) || 'single'
    } as ElementOptions
    
    super(options.id, elementOptions)
    
    this.name = options.name
    this.label = options.label || options.name
    this.required = options.required || false
    this.disabled = options.disabled || false
    this.validator = options.validator
    
    // Setup theme colors
    this.errorColor = resolveColor('#ef4444')
    this.successColor = resolveColor('#10b981')
    this.focusedBorderColor = resolveColor('#3b82f6')
    this.placeholderColor = resolveColor('#64748b')
    
    if (options.defaultValue !== undefined) {
      this.setValue(options.defaultValue)
    }
  }
  
  abstract getValue(): any
  abstract setValue(value: any): void
  abstract validate(): boolean
  
  public getError(): string | null {
    return this.error
  }
  
  public clearError(): void {
    this.error = null
    this.needsRefresh = true
  }
  
  protected setError(error: string): void {
    this.error = error
    this.needsRefresh = true
  }
  
  public setDisabled(disabled: boolean): void {
    this.disabled = disabled
    this.needsRefresh = true
  }
  
  public isDisabled(): boolean {
    return this.disabled
  }
  
  public setRequired(required: boolean): void {
    this.required = required
    this.needsRefresh = true
  }
  
  public isRequired(): boolean {
    return this.required
  }
  
  // Override to prevent interaction when disabled
  public handleKeyPress(key: ParsedKey): boolean {
    if (this.disabled) {
      return false
    }
    return this.handleKeyPressInternal(key)
  }
  
  // Subclasses implement this instead of handleKeyPress
  protected abstract handleKeyPressInternal(key: ParsedKey): boolean
}