/**
 * React Reconciler-based Terminal UI
 */

export { render, unmount, createApp } from './renderer.js'
export type { TerminalApp } from './renderer.js'

// Performance metrics
export { getRenderingMetrics } from './terminal-renderer.js'

// Re-export React for convenience
export { default as React } from 'react'

// Export element types for TypeScript
export type { 
  BoxProps,
  TextProps,
  BaseProps,
} from './terminal-element.js'