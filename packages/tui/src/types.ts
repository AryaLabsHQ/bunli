export interface TuiRendererOptions {
  exitOnCtrlC?: boolean;
  targetFps?: number;
  enableMouseMovement?: boolean;
  useMouse?: boolean;
  [key: string]: unknown;
}

export interface TuiConfig {
  renderer?: TuiRendererOptions;
}
