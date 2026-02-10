import type { TuiRenderOptions } from '@bunli/core'

export function getUseAlternateScreen(options: TuiRenderOptions | undefined): boolean {
  const mode = options?.bufferMode
  if (mode === 'alternate') return true
  if (mode === 'standard') return false

  // OpenTUI default is typically alternate screen; keep that behavior unless told otherwise.
  const maybe = options?.useAlternateScreen
  if (typeof maybe === 'boolean') return maybe

  return true
}

