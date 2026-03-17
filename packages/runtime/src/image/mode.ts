import type { ImageRenderMode } from './types.js'

export interface ResolveImageRenderModeInput {
  flagMode?: ImageRenderMode
  configMode?: ImageRenderMode
  defaultMode?: ImageRenderMode
}

export function resolveImageRenderMode(input: ResolveImageRenderModeInput = {}): ImageRenderMode {
  if (input.flagMode) return input.flagMode
  if (input.configMode) return input.configMode
  return input.defaultMode ?? 'auto'
}

export function shouldFailOnImageMiss(mode: ImageRenderMode): boolean {
  return mode === 'on'
}
