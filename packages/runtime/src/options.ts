export interface TuiRenderOptions {
  exitOnCtrlC?: boolean
  targetFps?: number
  enableMouseMovement?: boolean
  useMouse?: boolean
  /**
   * Terminal buffer mode for OpenTUI-backed renderers.
   * - 'alternate': full-screen alternate buffer
   * - 'standard': render in the main buffer
   */
  bufferMode?: 'alternate' | 'standard'
  [key: string]: unknown
}

export function getUseAlternateScreen(options: TuiRenderOptions | undefined): boolean {
  const mode = options?.bufferMode
  if (mode === 'alternate') return true
  if (mode === 'standard') return false

  // Runtime defaults to standard-buffer rendering unless alternate is explicitly requested.
  return false
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
