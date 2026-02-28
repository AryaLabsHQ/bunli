// Spinner types
export interface SpinnerOptions {
  text?: string
  color?: string
}

export interface Spinner {
  start(text?: string): void
  stop(text?: string): void
  succeed(text?: string): void
  fail(text?: string): void
  warn(text?: string): void
  info(text?: string): void
  update(text: string): void
}

// Color types (using Bun's built-in colors)
export type ColorFunction = (text: string) => string

export interface Colors {
  black: ColorFunction
  red: ColorFunction
  green: ColorFunction
  yellow: ColorFunction
  blue: ColorFunction
  magenta: ColorFunction
  cyan: ColorFunction
  white: ColorFunction
  gray: ColorFunction

  brightRed: ColorFunction
  brightGreen: ColorFunction
  brightYellow: ColorFunction
  brightBlue: ColorFunction
  brightMagenta: ColorFunction
  brightCyan: ColorFunction
  brightWhite: ColorFunction

  bgRed: ColorFunction
  bgGreen: ColorFunction
  bgYellow: ColorFunction
  bgBlue: ColorFunction
  bgMagenta: ColorFunction
  bgCyan: ColorFunction
  bgWhite: ColorFunction

  bold: ColorFunction
  dim: ColorFunction
  italic: ColorFunction
  underline: ColorFunction
  strikethrough: ColorFunction

  reset: ColorFunction
  strip: (text: string) => string
}

export interface BunliUtils {
  spinner: (options?: SpinnerOptions | string) => Spinner
  colors: Colors
}
