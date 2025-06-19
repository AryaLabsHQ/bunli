/**
 * ANSI escape code utilities for terminal styling
 */

import ansiStyles from './ansi-styles.js'
import type { Style, Color } from '../types.js'

/**
 * Parse color value to ANSI codes
 */
function parseColor(color: Color): { open: string; close: string } {
  if (typeof color === 'string') {
    // Handle named colors
    if (color in ansiStyles.color) {
      return (ansiStyles.color as any)[color]
    }
    
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return {
        open: ansiStyles.color.ansi16m(r, g, b),
        close: ansiStyles.color.close
      }
    }
    
    // Try to parse as ansi256 color number
    const num = parseInt(color, 10)
    if (!isNaN(num) && num >= 0 && num <= 255) {
      return {
        open: ansiStyles.color.ansi256(num),
        close: ansiStyles.color.close
      }
    }
  } else if (typeof color === 'object' && 'r' in color) {
    // RGB object
    return {
      open: ansiStyles.color.ansi16m(color.r, color.g, color.b),
      close: ansiStyles.color.close
    }
  }
  
  // Default to no color
  return { open: '', close: '' }
}

/**
 * Apply style object to text
 */
export function applyStyle(text: string, style: Style): string {
  let result = text
  const codes: string[] = []
  const closeCodes: string[] = []
  
  // Text decorations
  if (style.bold) {
    codes.push(ansiStyles.bold.open)
    closeCodes.push(ansiStyles.bold.close)
  }
  
  if (style.italic) {
    codes.push(ansiStyles.italic.open)
    closeCodes.push(ansiStyles.italic.close)
  }
  
  if (style.underline) {
    codes.push(ansiStyles.underline.open)
    closeCodes.push(ansiStyles.underline.close)
  }
  
  if (style.strikethrough) {
    codes.push(ansiStyles.strikethrough.open)
    closeCodes.push(ansiStyles.strikethrough.close)
  }
  
  if (style.dim) {
    codes.push(ansiStyles.dim.open)
    closeCodes.push(ansiStyles.dim.close)
  }
  
  if (style.inverse) {
    codes.push(ansiStyles.inverse.open)
    closeCodes.push(ansiStyles.inverse.close)
  }
  
  // Colors
  if (style.color) {
    const color = parseColor(style.color)
    if (color.open) {
      codes.push(color.open)
      closeCodes.push(color.close)
    }
  }
  
  if (style.backgroundColor) {
    const color = parseColor(style.backgroundColor)
    if (color.open) {
      // Convert foreground to background codes
      const bgOpen = color.open.replace('[3', '[4')
      const bgClose = color.close.replace('[3', '[4')
      codes.push(bgOpen)
      closeCodes.push(bgClose)
    }
  }
  
  // Apply all codes
  if (codes.length > 0) {
    result = codes.join('') + result + closeCodes.reverse().join('')
  }
  
  return result
}

/**
 * Box drawing characters for different border styles
 */
export const boxChars = {
  single: {
    topLeft: '┌',
    top: '─',
    topRight: '┐',
    right: '│',
    bottomRight: '┘',
    bottom: '─',
    bottomLeft: '└',
    left: '│'
  },
  double: {
    topLeft: '╔',
    top: '═',
    topRight: '╗',
    right: '║',
    bottomRight: '╝',
    bottom: '═',
    bottomLeft: '╚',
    left: '║'
  },
  round: {
    topLeft: '╭',
    top: '─',
    topRight: '╮',
    right: '│',
    bottomRight: '╯',
    bottom: '─',
    bottomLeft: '╰',
    left: '│'
  },
  bold: {
    topLeft: '┏',
    top: '━',
    topRight: '┓',
    right: '┃',
    bottomRight: '┛',
    bottom: '━',
    bottomLeft: '┗',
    left: '┃'
  },
  classic: {
    topLeft: '+',
    top: '-',
    topRight: '+',
    right: '|',
    bottomRight: '+',
    bottom: '-',
    bottomLeft: '+',
    left: '|'
  }
}

/**
 * Get box characters for a border style
 */
export function getBorderChars(style: Style['border']) {
  if (!style || style === 'none') {
    return null
  }
  
  if (style === true) {
    return boxChars.single
  }
  
  if (typeof style === 'string' && style in boxChars) {
    return boxChars[style as keyof typeof boxChars]
  }
  
  return boxChars.single
}