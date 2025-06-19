/**
 * React Reconciler-based Terminal UI
 */

export { render, unmount, createApp } from './renderer.js'
export type { TerminalApp } from './renderer.js'

// Performance metrics
export { getRenderingMetrics } from './terminal-renderer.js'

// Export element types for TypeScript
export type { 
  BoxProps,
  TextProps,
} from './terminal-element.js'