const ANSI_RESET = '\x1b[0m'
const ANSI_BOLD = '\x1b[1m'
const ANSI_FAINT = '\x1b[2m'
const ANSI_ITALIC = '\x1b[3m'
const ANSI_UNDERLINE = '\x1b[4m'
const ANSI_STRIKETHROUGH = '\x1b[9m'

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  magenta: [255, 0, 255],
  cyan: [0, 255, 255],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
}

export type BorderType = 'rounded' | 'normal' | 'thick' | 'double' | 'hidden' | 'none'

export const BORDERS: Record<BorderType, { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; horizontal: string; vertical: string }> = {
  rounded: { topLeft: '\u256D', topRight: '\u256E', bottomLeft: '\u2570', bottomRight: '\u256F', horizontal: '\u2500', vertical: '\u2502' },
  normal: { topLeft: '\u250C', topRight: '\u2510', bottomLeft: '\u2514', bottomRight: '\u2518', horizontal: '\u2500', vertical: '\u2502' },
  thick: { topLeft: '\u250F', topRight: '\u2513', bottomLeft: '\u2517', bottomRight: '\u251B', horizontal: '\u2501', vertical: '\u2503' },
  double: { topLeft: '\u2554', topRight: '\u2557', bottomLeft: '\u255A', bottomRight: '\u255D', horizontal: '\u2550', vertical: '\u2551' },
  hidden: { topLeft: ' ', topRight: ' ', bottomLeft: ' ', bottomRight: ' ', horizontal: ' ', vertical: ' ' },
  none: { topLeft: '', topRight: '', bottomLeft: '', bottomRight: '', horizontal: '', vertical: '' },
}

export interface StyleBuilder {
  foreground(color: string): StyleBuilder
  background(color: string): StyleBuilder
  bold(): StyleBuilder
  italic(): StyleBuilder
  underline(): StyleBuilder
  strikethrough(): StyleBuilder
  faint(): StyleBuilder
  border(type: BorderType): StyleBuilder
  borderForeground(color: string): StyleBuilder
  padding(top: number, right?: number, bottom?: number, left?: number): StyleBuilder
  margin(top: number, right?: number, bottom?: number, left?: number): StyleBuilder
  width(w: number): StyleBuilder
  align(position: 'left' | 'center' | 'right'): StyleBuilder
  render(text: string): string
}

interface StyleState {
  fg: string | null
  bg: string | null
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikethrough: boolean
  isFaint: boolean
  borderType: BorderType | null
  borderFg: string | null
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  fixedWidth: number | null
  alignment: 'left' | 'center' | 'right'
}

function defaultState(): StyleState {
  return {
    fg: null,
    bg: null,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    isFaint: false,
    borderType: null,
    borderFg: null,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    fixedWidth: null,
    alignment: 'left',
  }
}

function cloneState(s: StyleState): StyleState {
  return { ...s }
}

function parseColor(color: string): [number, number, number] | null {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16)
      const g = parseInt(hex[1]! + hex[1]!, 16)
      const b = parseInt(hex[2]! + hex[2]!, 16)
      return [r, g, b]
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return [r, g, b]
    }
    return null
  }
  const named = NAMED_COLORS[color.toLowerCase()]
  if (named) return named
  return null
}

function ansiColor(color: string, isBg: boolean): string {
  const rgb = parseColor(color)
  if (!rgb) return ''
  const [r, g, b] = rgb
  const prefix = isBg ? 48 : 38
  return `\x1b[${prefix};2;${r};${g};${b}m`
}

/** Strip ANSI escape sequences to get visible character count */
function visibleLength(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length
}

function createBuilder(state: StyleState): StyleBuilder {
  return {
    foreground(color: string) {
      const next = cloneState(state)
      next.fg = color
      return createBuilder(next)
    },
    background(color: string) {
      const next = cloneState(state)
      next.bg = color
      return createBuilder(next)
    },
    bold() {
      const next = cloneState(state)
      next.isBold = true
      return createBuilder(next)
    },
    italic() {
      const next = cloneState(state)
      next.isItalic = true
      return createBuilder(next)
    },
    underline() {
      const next = cloneState(state)
      next.isUnderline = true
      return createBuilder(next)
    },
    strikethrough() {
      const next = cloneState(state)
      next.isStrikethrough = true
      return createBuilder(next)
    },
    faint() {
      const next = cloneState(state)
      next.isFaint = true
      return createBuilder(next)
    },
    border(type: BorderType) {
      const next = cloneState(state)
      next.borderType = type
      return createBuilder(next)
    },
    borderForeground(color: string) {
      const next = cloneState(state)
      next.borderFg = color
      return createBuilder(next)
    },
    padding(top: number, right?: number, bottom?: number, left?: number) {
      const next = cloneState(state)
      next.paddingTop = top
      next.paddingRight = right ?? top
      next.paddingBottom = bottom ?? top
      next.paddingLeft = left ?? (right ?? top)
      return createBuilder(next)
    },
    margin(top: number, right?: number, bottom?: number, left?: number) {
      const next = cloneState(state)
      next.marginTop = top
      next.marginRight = right ?? top
      next.marginBottom = bottom ?? top
      next.marginLeft = left ?? (right ?? top)
      return createBuilder(next)
    },
    width(w: number) {
      const next = cloneState(state)
      next.fixedWidth = w
      return createBuilder(next)
    },
    align(position: 'left' | 'center' | 'right') {
      const next = cloneState(state)
      next.alignment = position
      return createBuilder(next)
    },
    render(text: string): string {
      return renderStyled(state, text)
    },
  }
}

function renderStyled(state: StyleState, text: string): string {
  const lines = text.split('\n')

  // Step 1-2: Build ANSI prefix for text decorations and colors
  let ansiPrefix = ''
  if (state.isBold) ansiPrefix += ANSI_BOLD
  if (state.isFaint) ansiPrefix += ANSI_FAINT
  if (state.isItalic) ansiPrefix += ANSI_ITALIC
  if (state.isUnderline) ansiPrefix += ANSI_UNDERLINE
  if (state.isStrikethrough) ansiPrefix += ANSI_STRIKETHROUGH
  if (state.fg) ansiPrefix += ansiColor(state.fg, false)
  if (state.bg) ansiPrefix += ansiColor(state.bg, true)

  const hasAnsi = ansiPrefix.length > 0

  // Apply ANSI codes to each line
  let styledLines = lines.map(line => {
    if (hasAnsi) return `${ansiPrefix}${line}${ANSI_RESET}`
    return line
  })

  // Step 3: Apply width and alignment
  if (state.fixedWidth !== null && state.fixedWidth > 0) {
    const w = state.fixedWidth
    styledLines = styledLines.map(line => {
      const vLen = visibleLength(line)
      if (vLen >= w) return line
      const diff = w - vLen
      switch (state.alignment) {
        case 'center': {
          const leftPad = Math.floor(diff / 2)
          const rightPad = diff - leftPad
          return ' '.repeat(leftPad) + line + ' '.repeat(rightPad)
        }
        case 'right':
          return ' '.repeat(diff) + line
        case 'left':
        default:
          return line + ' '.repeat(diff)
      }
    })
  }

  // Step 4: Apply padding
  if (state.paddingTop > 0 || state.paddingBottom > 0 || state.paddingLeft > 0 || state.paddingRight > 0) {
    const maxVisible = Math.max(...styledLines.map(l => visibleLength(l)))
    const leftPad = ' '.repeat(state.paddingLeft)
    const rightPad = ' '.repeat(state.paddingRight)

    styledLines = styledLines.map(line => {
      const vLen = visibleLength(line)
      const extraRight = ' '.repeat(maxVisible - vLen)
      return leftPad + line + extraRight + rightPad
    })

    const emptyLineWidth = visibleLength(styledLines[0] ?? '')
    const emptyLine = ' '.repeat(emptyLineWidth)

    const topLines = Array.from<string>({ length: state.paddingTop }).fill(emptyLine)
    const bottomLines = Array.from<string>({ length: state.paddingBottom }).fill(emptyLine)
    styledLines = [...topLines, ...styledLines, ...bottomLines]
  }

  // Step 5: Apply border
  if (state.borderType && state.borderType !== 'none') {
    const border = BORDERS[state.borderType]
    const maxVisible = Math.max(...styledLines.map(l => visibleLength(l)))

    const borderPrefix = state.borderFg ? ansiColor(state.borderFg, false) : ''
    const borderSuffix = state.borderFg ? ANSI_RESET : ''

    const topBorder = `${borderPrefix}${border.topLeft}${border.horizontal.repeat(maxVisible)}${border.topRight}${borderSuffix}`
    const bottomBorder = `${borderPrefix}${border.bottomLeft}${border.horizontal.repeat(maxVisible)}${border.bottomRight}${borderSuffix}`

    styledLines = styledLines.map(line => {
      const vLen = visibleLength(line)
      const pad = ' '.repeat(maxVisible - vLen)
      return `${borderPrefix}${border.vertical}${borderSuffix}${line}${pad}${borderPrefix}${border.vertical}${borderSuffix}`
    })

    styledLines = [topBorder, ...styledLines, bottomBorder]
  }

  // Step 6: Apply margin
  if (state.marginTop > 0 || state.marginBottom > 0 || state.marginLeft > 0 || state.marginRight > 0) {
    if (state.marginLeft > 0) {
      const leftMargin = ' '.repeat(state.marginLeft)
      styledLines = styledLines.map(line => leftMargin + line)
    }

    if (state.marginRight > 0) {
      const rightMargin = ' '.repeat(state.marginRight)
      styledLines = styledLines.map(line => line + rightMargin)
    }

    const topMarginLines = Array.from<string>({ length: state.marginTop }).fill('')
    const bottomMarginLines = Array.from<string>({ length: state.marginBottom }).fill('')
    styledLines = [...topMarginLines, ...styledLines, ...bottomMarginLines]
  }

  return styledLines.join('\n')
}

export function styled(): StyleBuilder {
  return createBuilder(defaultState())
}
