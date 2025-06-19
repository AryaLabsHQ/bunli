/**
 * Optimized style utilities for fast comparison
 */

import type { Style } from '../types.js'

// Style properties that affect layout
const LAYOUT_STYLE_PROPS: (keyof Style)[] = [
  'width', 
  'height', 
  'minWidth', 
  'maxWidth', 
  'minHeight', 
  'maxHeight',
  'border' // Border affects layout by reducing content area
]

// Style properties that only affect rendering
const RENDER_STYLE_PROPS: (keyof Style)[] = [
  'color',
  'backgroundColor',
  'bold',
  'dim',
  'italic',
  'underline',
  'inverse',
  'strikethrough'
]

/**
 * Fast shallow comparison of two styles
 * Returns true if styles are equal
 */
export function stylesEqual(a?: Style, b?: Style): boolean {
  // Fast path: same reference or both undefined
  if (a === b) return true
  
  // If one is undefined and the other isn't, they're different
  if (!a || !b) return false
  
  // Compare all style properties
  // Using explicit property access is faster than Object.keys iteration
  return (
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.inverse === b.inverse &&
    a.strikethrough === b.strikethrough &&
    a.border === b.border &&
    a.width === b.width &&
    a.height === b.height &&
    a.minWidth === b.minWidth &&
    a.maxWidth === b.maxWidth &&
    a.minHeight === b.minHeight &&
    a.maxHeight === b.maxHeight
  )
}

/**
 * Check if style changes require layout recalculation
 */
export function styleAffectsLayout(oldStyle?: Style, newStyle?: Style): boolean {
  // Fast path: same reference
  if (oldStyle === newStyle) return false
  
  // If one is undefined and the other isn't, check if any layout props are set
  if (!oldStyle) {
    return newStyle ? hasLayoutProps(newStyle) : false
  }
  if (!newStyle) {
    return hasLayoutProps(oldStyle)
  }
  
  // Check each layout-affecting property
  for (const prop of LAYOUT_STYLE_PROPS) {
    if (oldStyle[prop] !== newStyle[prop]) {
      return true
    }
  }
  
  return false
}

/**
 * Check if style changes only affect rendering (not layout)
 */
export function styleAffectsRenderOnly(oldStyle?: Style, newStyle?: Style): boolean {
  // Fast path: same reference
  if (oldStyle === newStyle) return false
  
  // If styles are completely equal, no changes
  if (stylesEqual(oldStyle, newStyle)) return false
  
  // If layout is affected, it's not render-only
  if (styleAffectsLayout(oldStyle, newStyle)) return false
  
  // At this point, we know something changed but not layout
  // So it must be a render-only change
  return true
}

/**
 * Check if a style has any layout-affecting properties
 */
function hasLayoutProps(style: Style): boolean {
  for (const prop of LAYOUT_STYLE_PROPS) {
    if (style[prop] !== undefined) {
      return true
    }
  }
  return false
}

/**
 * Create a normalized style object (for caching)
 * This ensures consistent property order for better comparison
 */
export function normalizeStyle(style?: Style): Style | undefined {
  if (!style) return undefined
  
  // Create a new object with consistent property order
  const normalized: Style = {}
  
  // Add properties in a consistent order
  if (style.color !== undefined) normalized.color = style.color
  if (style.backgroundColor !== undefined) normalized.backgroundColor = style.backgroundColor
  if (style.bold !== undefined) normalized.bold = style.bold
  if (style.dim !== undefined) normalized.dim = style.dim
  if (style.italic !== undefined) normalized.italic = style.italic
  if (style.underline !== undefined) normalized.underline = style.underline
  if (style.inverse !== undefined) normalized.inverse = style.inverse
  if (style.strikethrough !== undefined) normalized.strikethrough = style.strikethrough
  if (style.border !== undefined) normalized.border = style.border
  if (style.width !== undefined) normalized.width = style.width
  if (style.height !== undefined) normalized.height = style.height
  if (style.minWidth !== undefined) normalized.minWidth = style.minWidth
  if (style.maxWidth !== undefined) normalized.maxWidth = style.maxWidth
  if (style.minHeight !== undefined) normalized.minHeight = style.minHeight
  if (style.maxHeight !== undefined) normalized.maxHeight = style.maxHeight
  
  return normalized
}

/**
 * Create a style hash for quick comparison (useful for memoization)
 * This is faster than JSON.stringify for style objects
 */
export function styleHash(style?: Style): string {
  if (!style) return ''
  
  // Build a hash string with only defined properties
  const parts: string[] = []
  
  if (style.color) parts.push(`c:${style.color}`)
  if (style.backgroundColor) parts.push(`bg:${style.backgroundColor}`)
  if (style.bold) parts.push('b')
  if (style.dim) parts.push('d')
  if (style.italic) parts.push('i')
  if (style.underline) parts.push('u')
  if (style.inverse) parts.push('inv')
  if (style.strikethrough) parts.push('s')
  if (style.border) parts.push(`br:${style.border}`)
  if (style.width !== undefined) parts.push(`w:${style.width}`)
  if (style.height !== undefined) parts.push(`h:${style.height}`)
  if (style.minWidth !== undefined) parts.push(`mw:${style.minWidth}`)
  if (style.maxWidth !== undefined) parts.push(`xw:${style.maxWidth}`)
  if (style.minHeight !== undefined) parts.push(`mh:${style.minHeight}`)
  if (style.maxHeight !== undefined) parts.push(`xh:${style.maxHeight}`)
  
  return parts.join('|')
}