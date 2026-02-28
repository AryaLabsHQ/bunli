export { registerTuiRenderer } from './renderer.js'
export * from './components/index.js'

export { prompt, type PromptApi, PromptCancelledError, isCancel } from './prompt/index.js'
export * as inline from './inline/index.js'
export * as interactive from './interactive/index.js'
export * as charts from './charts/index.js'

export {
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
  useTimeline,
  useOnResize
} from '@opentui/react'

export type {
  SelectOption,
  KeyEvent,
  CliRendererConfig
} from '@opentui/core'

export {
  bold,
  fg,
  italic,
  t,
  TextAttributes
} from '@opentui/core'
