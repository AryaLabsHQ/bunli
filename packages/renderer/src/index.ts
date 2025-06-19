// Core rendering exports
export { render, unmount, createApp, getRenderingMetrics } from './reconciler/index.js'
export type { TerminalApp } from './reconciler/index.js'

// Base components
export { Box, Text, Row, Column } from './reconciler/components.js'
export type { BoxProps, TextProps } from './reconciler/components.js'

// Terminal element types
export type {
  TerminalElement,
  TerminalTextElement,
  TerminalBoxElement,
  Position,
  ElementProps,
  TextContent,
  BoxContent,
} from './reconciler/terminal-element.js'

// Style types
export type {
  Style,
  Color,
  FontWeight,
  FlexDirection,
  JustifyContent,
  AlignItems,
  TextWrap,
  Position as PositionType,
  Display,
  Overflow,
  BorderStyle,
} from './types.js'

// Performance utilities
export { now, nanoTime, measureTime, measureTimeAsync, MetricsTracker, FrameTracker } from './utils/performance.js'

// Style utilities  
export { stylesEqual, styleAffectsLayout, styleAffectsRenderOnly, styleHash } from './utils/style-utils.js'

// Cleanup utilities
export { isCleanupSupported, getCleanupStats } from './reconciler/cleanup-registry.js'

// Buffer renderer (for advanced usage)
export { renderWithBuffer } from './reconciler/buffer-renderer.js'