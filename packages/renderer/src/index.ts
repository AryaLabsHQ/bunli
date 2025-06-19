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