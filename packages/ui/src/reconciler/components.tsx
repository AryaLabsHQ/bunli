/**
 * React components for terminal UI
 */

import React from 'react'
import type { BoxProps, TextProps } from './terminal-element.js'

// Declare intrinsic elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'terminal-box': BoxProps
      'terminal-text': TextProps
      'terminal-row': BoxProps
      'terminal-column': BoxProps
    }
  }
}

/**
 * Box component - fundamental container
 */
export const Box = React.forwardRef<any, BoxProps>((props, ref) => {
  return React.createElement('terminal-box', { ...props, ref })
})
Box.displayName = 'Box'

/**
 * Text component - renders text
 */
export const Text = React.forwardRef<any, TextProps>((props, ref) => {
  return React.createElement('terminal-text', { ...props, ref })
})
Text.displayName = 'Text'

/**
 * Row component - horizontal layout
 */
export const Row = React.forwardRef<any, Omit<BoxProps, 'direction'>>((props, ref) => {
  return React.createElement('terminal-row', { ...props, direction: 'horizontal', ref })
})
Row.displayName = 'Row'

/**
 * Column component - vertical layout
 */
export const Column = React.forwardRef<any, Omit<BoxProps, 'direction'>>((props, ref) => {
  return React.createElement('terminal-column', { ...props, direction: 'vertical', ref })
})
Column.displayName = 'Column'