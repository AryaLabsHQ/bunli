/**
 * TUI Registry - manages the global TUI renderer
 * This module provides a simple registry for TUI renderers
 */

import type { RenderArgs } from '../types.js'

let renderer: ((args: RenderArgs<any, any>) => Promise<unknown> | unknown) | null = null

export function registerTuiRenderer(fn: (args: RenderArgs<any, any>) => Promise<unknown> | unknown) {
  renderer = fn
}

export function getTuiRenderer() {
  return renderer
}

export function clearTuiRenderer() {
  renderer = null
}
