// Export TUI renderer registration
export { registerTuiRenderer } from './renderer.js'

// Export component library
export * from './components/index.js'

// Re-export useful OpenTUI React hooks and types
export {
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
  useTimeline,
  useOnResize
} from '@opentui/react'

// Re-export useful OpenTUI core types and utilities
export type {
  SelectOption,
  KeyEvent,
  CliRendererConfig
} from '@opentui/core'

// Re-export text styling utilities
export {
  bold,
  fg,
  italic,
  t,
  TextAttributes
} from '@opentui/core'
