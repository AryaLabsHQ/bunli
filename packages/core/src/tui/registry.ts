/**
 * TUI Registry - manages the global TUI renderer
 * This module provides a simple registry for TUI renderers
 */

import type { RenderArgs } from '../types.js'

let renderer: ((args: RenderArgs<any, any>) => Promise<unknown> | unknown) | null = null

export function registerTuiRenderer<TFlags = Record<string, unknown>, TStore = {}>(
  fn: (args: RenderArgs<TFlags, TStore>) => Promise<unknown> | unknown
) {
  renderer = fn as (args: RenderArgs<any, any>) => Promise<unknown> | unknown
}

export function getTuiRenderer<TFlags = Record<string, unknown>, TStore = {}>() {
  return renderer as ((args: RenderArgs<TFlags, TStore>) => Promise<unknown> | unknown) | null
}

export function clearTuiRenderer() {
  renderer = null
}
