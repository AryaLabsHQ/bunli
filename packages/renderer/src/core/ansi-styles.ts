/**
 * ANSI escape sequence utilities
 * Based on ansi-styles but optimized for our use case
 */

const ANSI_BACKGROUND_OFFSET = 10

const wrapAnsi16 = (offset = 0) => (code: number) => `\u001B[${code + offset}m`

const wrapAnsi256 = (offset = 0) => (code: number) => `\u001B[${38 + offset};5;${code}m`

const wrapAnsi16m = (offset = 0) => (red: number, green: number, blue: number) => 
  `\u001B[${38 + offset};2;${red};${green};${blue}m`

export interface CSPair {
  /**
   * The ANSI terminal control sequence for starting this style.
   */
  readonly open: string

  /**
   * The ANSI terminal control sequence for ending this style.
   */
  readonly close: string
}

export interface ColorBase {
  /**
   * The ANSI terminal control sequence for ending this color.
   */
  readonly close: string

  ansi(code: number): string
  ansi256(code: number): string
  ansi16m(red: number, green: number, blue: number): string
}

const styles = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],

    // Bright color
    blackBright: [90, 39],
    gray: [90, 39], // Alias of `blackBright`
    grey: [90, 39], // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39],
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],

    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49], // Alias of `bgBlackBright`
    bgGrey: [100, 49], // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49],
  },
}

export const modifierNames = Object.keys(styles.modifier) as ModifierName[]
export const foregroundColorNames = Object.keys(styles.color) as ForegroundColorName[]
export const backgroundColorNames = Object.keys(styles.bgColor) as BackgroundColorName[]
export const colorNames = [...foregroundColorNames, ...backgroundColorNames] as ColorName[]

function assembleStyles() {
  const codes = new Map<number, number>()
  const assembledStyles: any = {}

  for (const [groupName, group] of Object.entries(styles)) {
    const assembledGroup: any = {}
    
    for (const [styleName, style] of Object.entries(group)) {
      const styleObj = {
        open: `\u001B[${style[0]}m`,
        close: `\u001B[${style[1]}m`,
      }

      assembledGroup[styleName] = styleObj
      assembledStyles[styleName] = styleObj
      codes.set(style[0] as number, style[1] as number)
    }

    Object.defineProperty(assembledStyles, groupName, {
      value: assembledGroup,
      enumerable: false,
    })
  }

  Object.defineProperty(assembledStyles, 'codes', {
    value: codes,
    enumerable: false,
  })

  assembledStyles.color.close = '\u001B[39m'
  assembledStyles.bgColor.close = '\u001B[49m'

  assembledStyles.color.ansi = wrapAnsi16()
  assembledStyles.color.ansi256 = wrapAnsi256()
  assembledStyles.color.ansi16m = wrapAnsi16m()
  assembledStyles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET)
  assembledStyles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET)
  assembledStyles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET)

  Object.defineProperties(assembledStyles, {
    rgbToAnsi256: {
      value(red: number, green: number, blue: number) {
        // We use the extended greyscale palette here, with the exception of
        // black and white. normal palette only has 4 greyscale shades.
        if (red === green && green === blue) {
          if (red < 8) {
            return 16
          }

          if (red > 248) {
            return 231
          }

          return Math.round(((red - 8) / 247) * 24) + 232
        }

        return 16
          + (36 * Math.round(red / 255 * 5))
          + (6 * Math.round(green / 255 * 5))
          + Math.round(blue / 255 * 5)
      },
      enumerable: false,
    },
    hexToRgb: {
      value(hex: string): [number, number, number] {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex)
        if (!matches) {
          return [0, 0, 0]
        }

        let [colorString] = matches

        if (colorString.length === 3) {
          colorString = [...colorString].map(character => character + character).join('')
        }

        const integer = Number.parseInt(colorString, 16)

        return [
          /* eslint-disable no-bitwise */
          (integer >> 16) & 0xFF,
          (integer >> 8) & 0xFF,
          integer & 0xFF,
          /* eslint-enable no-bitwise */
        ]
      },
      enumerable: false,
    },
    hexToAnsi256: {
      value: (hex: string) => assembledStyles.rgbToAnsi256(...assembledStyles.hexToRgb(hex)),
      enumerable: false,
    },
    ansi256ToAnsi: {
      value(code: number) {
        if (code < 8) {
          return 30 + code
        }

        if (code < 16) {
          return 90 + (code - 8)
        }

        let red
        let green
        let blue

        if (code >= 232) {
          red = (((code - 232) * 10) + 8) / 255
          green = red
          blue = red
        } else {
          code -= 16

          const remainder = code % 36

          red = Math.floor(code / 36) / 5
          green = Math.floor(remainder / 6) / 5
          blue = (remainder % 6) / 5
        }

        const value = Math.max(red, green, blue) * 2

        if (value === 0) {
          return 30
        }

        // eslint-disable-next-line no-bitwise
        let result = 30 + ((Math.round(blue) << 2) | (Math.round(green) << 1) | Math.round(red))

        if (value === 2) {
          result += 60
        }

        return result
      },
      enumerable: false,
    },
    rgbToAnsi: {
      value: (red: number, green: number, blue: number) => 
        assembledStyles.ansi256ToAnsi(assembledStyles.rgbToAnsi256(red, green, blue)),
      enumerable: false,
    },
    hexToAnsi: {
      value: (hex: string) => assembledStyles.ansi256ToAnsi(assembledStyles.hexToAnsi256(hex)),
      enumerable: false,
    },
  })

  return assembledStyles
}

const ansiStyles = assembleStyles()

export default ansiStyles

// Type definitions
export type Modifier = {
  readonly reset: CSPair
  readonly bold: CSPair
  readonly dim: CSPair
  readonly italic: CSPair
  readonly underline: CSPair
  readonly overline: CSPair
  readonly inverse: CSPair
  readonly hidden: CSPair
  readonly strikethrough: CSPair
}

export type ForegroundColor = {
  readonly black: CSPair
  readonly red: CSPair
  readonly green: CSPair
  readonly yellow: CSPair
  readonly blue: CSPair
  readonly cyan: CSPair
  readonly magenta: CSPair
  readonly white: CSPair
  readonly gray: CSPair
  readonly grey: CSPair
  readonly blackBright: CSPair
  readonly redBright: CSPair
  readonly greenBright: CSPair
  readonly yellowBright: CSPair
  readonly blueBright: CSPair
  readonly cyanBright: CSPair
  readonly magentaBright: CSPair
  readonly whiteBright: CSPair
}

export type BackgroundColor = {
  readonly bgBlack: CSPair
  readonly bgRed: CSPair
  readonly bgGreen: CSPair
  readonly bgYellow: CSPair
  readonly bgBlue: CSPair
  readonly bgCyan: CSPair
  readonly bgMagenta: CSPair
  readonly bgWhite: CSPair
  readonly bgGray: CSPair
  readonly bgGrey: CSPair
  readonly bgBlackBright: CSPair
  readonly bgRedBright: CSPair
  readonly bgGreenBright: CSPair
  readonly bgYellowBright: CSPair
  readonly bgBlueBright: CSPair
  readonly bgCyanBright: CSPair
  readonly bgMagentaBright: CSPair
  readonly bgWhiteBright: CSPair
}

export type ConvertColor = {
  rgbToAnsi256(red: number, green: number, blue: number): number
  hexToRgb(hex: string): [red: number, green: number, blue: number]
  hexToAnsi256(hex: string): number
  ansi256ToAnsi(code: number): number
  rgbToAnsi(red: number, green: number, blue: number): number
  hexToAnsi(hex: string): number
}

export type ModifierName = keyof Modifier
export type ForegroundColorName = keyof ForegroundColor
export type BackgroundColorName = keyof BackgroundColor
export type ColorName = ForegroundColorName | BackgroundColorName