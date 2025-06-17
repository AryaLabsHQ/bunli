import type { Colors, ColorFunction } from './types.js'

// ANSI color codes
const colorCodes = {
  // Foreground colors
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  
  // Bright foreground colors
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
  
  // Background colors
  bgRed: 41,
  bgGreen: 42,
  bgYellow: 43,
  bgBlue: 44,
  bgMagenta: 45,
  bgCyan: 46,
  bgWhite: 47,
  
  // Styles
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  strikethrough: 9,
  
  // Reset
  reset: 0,
} as const

function createColorFunction(code: number): ColorFunction {
  return (text: string) => {
    // Check if colors are supported
    if (!process.stdout.isTTY || process.env.NO_COLOR) {
      return text
    }
    return `\x1b[${code}m${text}\x1b[0m`
  }
}

function stripAnsi(text: string): string {
  // Remove all ANSI escape sequences
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

export const colors: Colors = {
  // Basic colors
  black: createColorFunction(colorCodes.black),
  red: createColorFunction(colorCodes.red),
  green: createColorFunction(colorCodes.green),
  yellow: createColorFunction(colorCodes.yellow),
  blue: createColorFunction(colorCodes.blue),
  magenta: createColorFunction(colorCodes.magenta),
  cyan: createColorFunction(colorCodes.cyan),
  white: createColorFunction(colorCodes.white),
  gray: createColorFunction(colorCodes.gray),
  
  // Bright colors
  brightRed: createColorFunction(colorCodes.brightRed),
  brightGreen: createColorFunction(colorCodes.brightGreen),
  brightYellow: createColorFunction(colorCodes.brightYellow),
  brightBlue: createColorFunction(colorCodes.brightBlue),
  brightMagenta: createColorFunction(colorCodes.brightMagenta),
  brightCyan: createColorFunction(colorCodes.brightCyan),
  brightWhite: createColorFunction(colorCodes.brightWhite),
  
  // Background colors
  bgRed: createColorFunction(colorCodes.bgRed),
  bgGreen: createColorFunction(colorCodes.bgGreen),
  bgYellow: createColorFunction(colorCodes.bgYellow),
  bgBlue: createColorFunction(colorCodes.bgBlue),
  bgMagenta: createColorFunction(colorCodes.bgMagenta),
  bgCyan: createColorFunction(colorCodes.bgCyan),
  bgWhite: createColorFunction(colorCodes.bgWhite),
  
  // Styles
  bold: createColorFunction(colorCodes.bold),
  dim: createColorFunction(colorCodes.dim),
  italic: createColorFunction(colorCodes.italic),
  underline: createColorFunction(colorCodes.underline),
  strikethrough: createColorFunction(colorCodes.strikethrough),
  
  // Utilities
  reset: createColorFunction(colorCodes.reset),
  strip: stripAnsi,
}