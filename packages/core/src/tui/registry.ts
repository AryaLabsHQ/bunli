/**
 * TUI Registry - manages the global TUI renderer
 * This module provides a simple registry for TUI renderers
 */

import type { RenderArgs } from '../types.js'

type TuiRenderer = (args: RenderArgs<any, any>) => Promise<unknown> | unknown

const TUI_RENDERER_SYMBOL = Symbol.for('bunli:tui:renderer')

interface TuiRendererGlobal {
  [TUI_RENDERER_SYMBOL]?: TuiRenderer
}

export function registerTuiRenderer<TFlags = Record<string, unknown>, TStore = {}>(
  fn: (args: RenderArgs<TFlags, TStore>) => Promise<unknown> | unknown
) {
  ;(globalThis as typeof globalThis & TuiRendererGlobal)[TUI_RENDERER_SYMBOL] =
    fn as TuiRenderer
}

export function getTuiRenderer<TFlags = Record<string, unknown>, TStore = {}>() {
  return (
    (globalThis as typeof globalThis & TuiRendererGlobal)[TUI_RENDERER_SYMBOL]
    ?? null
  ) as ((args: RenderArgs<TFlags, TStore>) => Promise<unknown> | unknown) | null
}

export function clearTuiRenderer() {
  delete (globalThis as typeof globalThis & TuiRendererGlobal)[TUI_RENDERER_SYMBOL]
}
