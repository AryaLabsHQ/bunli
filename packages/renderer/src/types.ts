/**
 * Core types for Bunli UI
 */

// Style definitions
export interface Style {
  // Colors
  color?: string | Color
  backgroundColor?: string | Color
  
  // Text decoration
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  dim?: boolean
  inverse?: boolean
  
  // Spacing (top, right, bottom, left)
  padding?: number | number[]
  margin?: number | number[]
  
  // Borders
  border?: BorderStyle | boolean
  borderColor?: string | Color
  
  // Layout
  width?: number | string // number = columns, string = '100%', '50%'
  height?: number | string // number = rows
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  
  // Visual
  opacity?: number // 0-1, will dim the content
  
  // Text alignment (for text components)
  align?: 'left' | 'center' | 'right'
  
  // Extended margin/padding shortcuts
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  
  // Extended border properties
  borderTop?: boolean | BorderStyle
  borderBottom?: boolean | BorderStyle
  borderLeft?: boolean | BorderStyle
  borderRight?: boolean | BorderStyle
  
  // Terminal UI specific
  cursor?: 'pointer' | 'default' // For clickable elements
  position?: 'relative' | 'absolute' // For future layout systems
  
  // Additional layout properties
  left?: number
  right?: number
  top?: number
  bottom?: number
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

// Color can be a string (name/hex) or RGB values
export type Color = string | { r: number; g: number; b: number }

// Border styles
export type BorderStyle = 
  | 'single'
  | 'double'
  | 'round'
  | 'bold'
  | 'classic'
  | 'none'

// Additional style types needed by the renderer
export type FontWeight = 'normal' | 'bold'
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'
export type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
export type AlignItems = 'start' | 'center' | 'end' | 'stretch'
export type TextWrap = 'wrap' | 'nowrap' | 'truncate'
export type Position = 'relative' | 'absolute'
export type Display = 'flex' | 'block' | 'none'
export type Overflow = 'visible' | 'hidden' | 'scroll'

// Text wrapping modes
export type WrapMode = 
  | 'wrap'           // Normal word wrapping
  | 'truncate'       // Cut off with ...
  | 'truncate-start' // ...text
  | 'truncate-middle'// te...xt
  | 'nowrap'         // Don't wrap at all

// Layout bounds for rendering
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// Render context passed to components
export interface RenderContext extends Bounds {
  // Terminal capabilities
  isColorSupported: boolean
  is256ColorSupported: boolean
  isTrueColorSupported: boolean
  
  // Current render state
  parentStyle?: Style
}

// Spacing helper type
export type Spacing = number | [number, number] | [number, number, number, number]

// Normalize spacing to [top, right, bottom, left]
export function normalizeSpacing(spacing?: Spacing): [number, number, number, number] {
  if (!spacing) return [0, 0, 0, 0]
  if (typeof spacing === 'number') return [spacing, spacing, spacing, spacing]
  if (spacing.length === 2) return [spacing[0], spacing[1], spacing[0], spacing[1]]
  if (spacing.length === 4) return spacing as [number, number, number, number]
  return [0, 0, 0, 0]
}