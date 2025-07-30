import { BufferedElement, type ParsedKey, RGBA } from '@opentui/core'
import { resolveColor } from '../utils/theme.js'

export interface ButtonOptions {
  id: string
  text: string
  variant?: 'primary' | 'secondary' | 'danger'
  onPress?: () => void
  disabled?: boolean
  width?: number | string
}

export class Button extends BufferedElement {
  private text: string
  private variant: 'primary' | 'secondary' | 'danger'
  private onPress?: () => void
  private disabled: boolean
  
  // Theme colors
  private primaryBg: RGBA
  private secondaryBg: RGBA
  private dangerBg: RGBA
  private disabledBg: RGBA
  
  constructor(options: ButtonOptions) {
    const width = options.width || options.text.length + 4
    
    super(options.id, {
      width,
      height: 3,
      border: true,
      borderStyle: 'single',
      backgroundColor: 'transparent'
    })
    
    this.text = options.text
    this.variant = options.variant || 'secondary'
    this.onPress = options.onPress
    this.disabled = options.disabled || false
    
    // Setup theme colors
    this.primaryBg = resolveColor('#3b82f6')
    this.secondaryBg = resolveColor('#64748b')
    this.dangerBg = resolveColor('#ef4444')
    this.disabledBg = resolveColor('#475569')
    
    this.updateColors()
  }
  
  private updateColors(): void {
    let bgColor: RGBA
    
    if (this.disabled) {
      bgColor = this.disabledBg
    } else {
      switch (this.variant) {
        case 'primary':
          bgColor = this.primaryBg
          break
        case 'danger':
          bgColor = this.dangerBg
          break
        default:
          bgColor = this.secondaryBg
      }
    }
    
    this.backgroundColor = bgColor
    this.borderColor = bgColor
    
    if (this.focused && !this.disabled) {
      // Lighten on focus
      const [r, g, b, a] = bgColor.buffer
      this.borderColor = RGBA.fromValues(
        Math.min(1, r * 1.2),
        Math.min(1, g * 1.2),
        Math.min(1, b * 1.2),
        a
      )
    }
    
    this.needsRefresh = true
  }
  
  public setDisabled(disabled: boolean): void {
    this.disabled = disabled
    this.updateColors()
  }
  
  public focus(): void {
    super.focus()
    this.updateColors()
  }
  
  public blur(): void {
    super.blur()
    this.updateColors()
  }
  
  public handleKeyPress(key: ParsedKey): boolean {
    if (this.disabled) {
      return false
    }
    
    if (key.name === 'enter' || key.name === 'space') {
      this.press()
      return true
    }
    
    return false
  }
  
  private press(): void {
    if (!this.disabled && this.onPress) {
      this.onPress()
    }
  }
  
  protected refreshContent(x: number, y: number, width: number, height: number): void {
    if (!this.frameBuffer) return
    
    // Center text
    const textX = Math.floor((width - this.text.length) / 2)
    const textY = 1 // Middle of 3-height button
    
    // Draw text
    const textColor = this.disabled 
      ? resolveColor('#94a3b8') 
      : resolveColor('#ffffff')
    
    this.frameBuffer.drawText(
      this.text,
      x + textX,
      y + textY,
      textColor
    )
    
    // Draw focus indicator
    if (this.focused && !this.disabled) {
      this.frameBuffer.drawText('▶', x, y + textY, textColor)
      this.frameBuffer.drawText('◀', x + width - 1, y + textY, textColor)
    }
  }
}