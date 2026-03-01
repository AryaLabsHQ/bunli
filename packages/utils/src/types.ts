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
  colors: Colors
}
