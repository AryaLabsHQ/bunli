import type { RenderResult } from '../types.js'

/**
 * Options passed to the TUI renderer when rendering a component
 */
export interface TuiRendererOptions {
  /**
   * Exit on Ctrl+C (default: true)
   */
  exitOnCtrlC?: boolean

  /**
   * Target frames per second (default: 30)
   */
  targetFps?: number

  /**
   * Enable mouse movement events (default: true)
   */
  enableMouseMovement?: boolean

  /**
   * Additional renderer-specific options
   */
  [key: string]: unknown
}

/**
 * Context passed when rendering TUI components
 */
export interface TuiRenderContext {
  /**
   * Renderer-specific options
   */
  rendererOptions?: TuiRendererOptions
}

/**
 * TUI Renderer interface
 * Implementations should handle rendering React components to the terminal
 */
export interface TuiRenderer {
  /**
   * Render a component result to the terminal
   * @param component The component or render result to render
   * @param context Rendering context and options
   * @returns Promise that resolves when rendering completes
   */
  render(component: RenderResult, context: TuiRenderContext): Promise<unknown>
}

/**
 * Global TUI renderer instance
 * Set by calling registerTuiRenderer()
 */
let globalRenderer: TuiRenderer | null = null

/**
 * Register a TUI renderer globally
 * @param renderer The renderer implementation
 */
export function registerTuiRenderer(renderer: TuiRenderer): void {
  globalRenderer = renderer
}

/**
 * Get the currently registered TUI renderer
 * @returns The registered renderer, or null if none registered
 */
export function getTuiRenderer(): TuiRenderer | null {
  return globalRenderer
}

/**
 * Clear the registered TUI renderer (mainly for testing)
 */
export function clearTuiRenderer(): void {
  globalRenderer = null
}
