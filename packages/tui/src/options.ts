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

export type OpenTuiRendererOptions = {
  exitOnCtrlC: boolean
  targetFps: number
  enableMouseMovement: boolean
  useMouse: boolean
  useAlternateScreen: boolean
} & TuiRenderOptions

export function resolveOpenTuiRendererOptions(options: TuiRenderOptions | undefined): OpenTuiRendererOptions {
  const value = options ?? {}
  const useMouse = typeof value.useMouse === 'boolean' ? value.useMouse : false

  return {
    ...value,
    exitOnCtrlC: value.exitOnCtrlC ?? true,
    targetFps: value.targetFps ?? 30,
    enableMouseMovement: value.enableMouseMovement ?? true,
    useMouse,
    useAlternateScreen: getUseAlternateScreen(value)
  }
}
