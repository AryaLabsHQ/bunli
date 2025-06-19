/**
 * @bunli/ui - React-based Terminal UI Framework
 */

// Core exports
export { render, unmount, createApp, getRenderingMetrics } from './reconciler/index.js'
export type { TerminalApp } from './reconciler/index.js'

// Component exports
export * from './components/index.js'

// Type exports
export type { 
  BoxProps, 
  TextProps,
  BaseProps,
} from './reconciler/terminal-element.js'

// Style exports
export { styles, mergeStyles } from './style/index.js'
export type { Style, Color, BorderStyle } from './style/index.js'

// Focus exports
export * from './focus/index.js'

// Plugin exports (for Bunli integration)
export { uiPlugin } from './plugin/index.js'
export type { UIContext, UIStore } from './plugin/index.js'
export { 
  defineUICommand, 
  defineComponentCommand, 
  defineRoutedCommand,
  withUI 
} from './plugin/helpers.js'
export type { UIHandlerArgs, Route } from './plugin/helpers.js'

// Router exports
export { Router, useRouter, NavLink, Breadcrumbs, RouteTabBar } from './router/index.js'
export type { RouterProps } from './router/index.js'

// Types
export type { 
  Spacing,
  WrapMode,
  Bounds,
  RenderContext
} from './types.js'

// React re-export for convenience
export { React } from './reconciler/index.js'

// Note: Hooks come from React itself now
export {
  useState,
  useEffect,
  useReducer,
  useMemo,
  useCallback,
  useLayoutEffect,
} from 'react'