/**
 * Efficient style diffing utilities for terminal rendering
 */

import type { Style } from '../types.js'
import ansiStyles from '../core/ansi-styles.js'

/**
 * Generate ANSI escape sequences for style changes
 * Only emits the minimal diff between current and next style
 */
export function styleToAnsi(nextStyle: Style | undefined, currentStyle: Style | undefined): string {
  // If no style change, return empty
  if (stylesEqual(nextStyle, currentStyle)) {
    return ''
  }
  
  // If clearing all styles
  if (!nextStyle && currentStyle) {
    return '\x1b[0m'
  }
  
  // If no current style, apply all new styles
  if (!currentStyle && nextStyle) {
    return applyAllStyles(nextStyle)
  }
  
  // Both styles exist - compute diff
  if (nextStyle && currentStyle) {
    const codes: string[] = []
    
    // Check if we need to reset (cheaper than individual resets sometimes)
    const needsReset = 
      (currentStyle.bold && !nextStyle.bold) ||
      (currentStyle.dim && !nextStyle.dim) ||
      (currentStyle.italic && !nextStyle.italic) ||
      (currentStyle.underline && !nextStyle.underline) ||
      (currentStyle.strikethrough && !nextStyle.strikethrough) ||
      (currentStyle.inverse && !nextStyle.inverse) ||
      (currentStyle.color !== nextStyle.color) ||
      (currentStyle.backgroundColor !== nextStyle.backgroundColor)
    
    if (needsReset) {
      // Reset and apply all new styles
      codes.push('\x1b[0m')
      codes.push(applyAllStyles(nextStyle))
    } else {
      // Apply only changed attributes
      if (nextStyle.bold && !currentStyle.bold) codes.push(ansiStyles.bold.open)
      if (nextStyle.dim && !currentStyle.dim) codes.push(ansiStyles.dim.open)
      if (nextStyle.italic && !currentStyle.italic) codes.push(ansiStyles.italic.open)
      if (nextStyle.underline && !currentStyle.underline) codes.push(ansiStyles.underline.open)
      if (nextStyle.strikethrough && !currentStyle.strikethrough) codes.push(ansiStyles.strikethrough.open)
      if (nextStyle.inverse && !currentStyle.inverse) codes.push(ansiStyles.inverse.open)
    }
    
    return codes.join('')
  }
  
  return ''
}

/**
 * Apply all styles from scratch
 */
function applyAllStyles(style: Style): string {
  const codes: string[] = []
  
  // Text attributes
  if (style.bold) codes.push(ansiStyles.bold.open)
  if (style.dim) codes.push(ansiStyles.dim.open)
  if (style.italic) codes.push(ansiStyles.italic.open)
  if (style.underline) codes.push(ansiStyles.underline.open)
  if (style.strikethrough) codes.push(ansiStyles.strikethrough.open)
  if (style.inverse) codes.push(ansiStyles.inverse.open)
  
  // Foreground color
  if (style.color) {
    const colorCode = getColorCode(style.color, false)
    if (colorCode) codes.push(colorCode)
  }
  
  // Background color
  if (style.backgroundColor) {
    const bgCode = getColorCode(style.backgroundColor, true)
    if (bgCode) codes.push(bgCode)
  }
  
  return codes.join('')
}

/**
 * Get ANSI color code for a color name or hex value
 */
function getColorCode(color: string, isBackground: boolean): string | null {
  // Check named colors first
  const namedColor = isBackground 
    ? (ansiStyles as any)[`bg${color.charAt(0).toUpperCase() + color.slice(1)}`]
    : (ansiStyles as any)[color]
  
  if (namedColor) {
    return namedColor.open
  }
  
  // Handle hex colors (basic 256 color approximation)
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color)
    if (rgb) {
      // Use 24-bit color if supported
      return isBackground
        ? `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`
        : `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
    }
  }
  
  return null
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null
}

/**
 * Check if two styles are equal
 */
export function stylesEqual(a: Style | undefined, b: Style | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  
  return (
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse &&
    a.border === b.border
  )
}

/**
 * Wrap output with cursor hide/show for Ghostty
 */
export function wrapWithCursorControl(content: string, isGhostty: boolean): string {
  if (!isGhostty || !content) return content
  
  return `\x1b[?25l${content}\x1b[?25h`
}

/**
 * Check if running in Ghostty terminal
 */
export function isGhosttyTerminal(): boolean {
  return process.env.TERM_PROGRAM === 'ghostty'
}