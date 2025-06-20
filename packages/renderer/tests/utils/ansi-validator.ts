/**
 * ANSI escape sequence validation utilities for testing
 */

export interface AnsiCommand {
  type: 'cursor' | 'clear' | 'style' | 'text'
  command?: string
  args?: number[]
  text?: string
  position?: { x: number; y: number }
  style?: {
    fg?: number
    bg?: number
    bold?: boolean
    dim?: boolean
    italic?: boolean
    underline?: boolean
    inverse?: boolean
    strikethrough?: boolean
  }
}

/**
 * Parse ANSI escape sequences into structured commands
 */
export function parseAnsiSequences(output: string): AnsiCommand[] {
  const commands: AnsiCommand[] = []
  // Extended regex to handle more ANSI sequences including cursor show/hide
  const ansiRegex = /\x1b\[([0-9;]*)([A-Za-z])|(\x1b\[[?][0-9]+[lh])/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = ansiRegex.exec(output)) !== null) {
    // Add any text before this escape sequence
    if (match.index > lastIndex) {
      const text = output.substring(lastIndex, match.index)
      if (text && !text.match(/^\x1b/)) { // Filter out escape sequences in text
        commands.push({ type: 'text', text })
      }
    }

    // Skip cursor show/hide sequences and other control sequences
    if (match[3]) {
      // This is a control sequence like ?25l or ?25h
      lastIndex = ansiRegex.lastIndex
      continue
    }

    const args = match[1] ? match[1].split(';').map(n => parseInt(n) || 0) : []
    const code = match[2]

    // Parse cursor positioning
    if (code === 'H' || code === 'f') {
      const y = args[0] || 1
      const x = args[1] || 1
      commands.push({
        type: 'cursor',
        command: 'position',
        position: { x, y },
        args
      })
    }
    // Parse cursor movement
    else if (code === 'A') {
      commands.push({ type: 'cursor', command: 'up', args })
    }
    else if (code === 'B') {
      commands.push({ type: 'cursor', command: 'down', args })
    }
    else if (code === 'C') {
      commands.push({ type: 'cursor', command: 'forward', args })
    }
    else if (code === 'D') {
      commands.push({ type: 'cursor', command: 'back', args })
    }
    // Parse clearing
    else if (code === 'K') {
      const mode = args[0] || 0
      commands.push({ 
        type: 'clear', 
        command: mode === 0 ? 'toEndOfLine' : mode === 1 ? 'toStartOfLine' : 'entireLine',
        args 
      })
    }
    else if (code === 'J') {
      const mode = args[0] || 0
      commands.push({ 
        type: 'clear', 
        command: mode === 0 ? 'toEndOfScreen' : mode === 1 ? 'toStartOfScreen' : 'entireScreen',
        args 
      })
    }
    // Parse SGR (styling)
    else if (code === 'm') {
      const style: AnsiCommand['style'] = {}
      let i = 0
      while (i < args.length) {
        const n = args[i]
        if (n === 0) {
          // Reset
          commands.push({ type: 'style', command: 'reset', style: {} })
        } else if (n === 1) style.bold = true
        else if (n === 2) style.dim = true
        else if (n === 3) style.italic = true
        else if (n === 4) style.underline = true
        else if (n === 7) style.inverse = true
        else if (n === 9) style.strikethrough = true
        else if (n >= 30 && n <= 37) style.fg = n - 30
        else if (n >= 40 && n <= 47) style.bg = n - 40
        else if (n >= 90 && n <= 97) style.fg = n - 90 + 8
        else if (n >= 100 && n <= 107) style.bg = n - 100 + 8
        else if (n === 38 && args[i + 1] === 5) {
          style.fg = args[i + 2]
          i += 2
        } else if (n === 48 && args[i + 1] === 5) {
          style.bg = args[i + 2]
          i += 2
        }
        i++
      }
      if (Object.keys(style).length > 0) {
        commands.push({ type: 'style', style })
      }
    }

    lastIndex = ansiRegex.lastIndex
  }

  // Add any remaining text
  if (lastIndex < output.length) {
    const text = output.substring(lastIndex)
    if (text) {
      commands.push({ type: 'text', text })
    }
  }

  return commands
}

/**
 * Validate that text appears at expected position
 */
export function validateTextPosition(
  commands: AnsiCommand[], 
  text: string, 
  expectedX: number, 
  expectedY: number,
  tolerance: number = 0
): boolean {
  let currentX = 1
  let currentY = 1

  for (const cmd of commands) {
    if (cmd.type === 'cursor' && cmd.position) {
      currentX = cmd.position.x
      currentY = cmd.position.y
    } else if (cmd.type === 'text' && cmd.text?.includes(text)) {
      const withinX = Math.abs(currentX - expectedX) <= tolerance
      const withinY = Math.abs(currentY - expectedY) <= tolerance
      if (withinX && withinY) {
        return true
      }
    }
  }

  return false
}

/**
 * Extract layout information from ANSI commands
 */
export interface LayoutInfo {
  text: string
  x: number
  y: number
  style?: AnsiCommand['style']
}

export function extractLayout(commands: AnsiCommand[]): LayoutInfo[] {
  const layout: LayoutInfo[] = []
  let currentX = 1
  let currentY = 1
  let currentStyle: AnsiCommand['style'] = {}

  for (const cmd of commands) {
    if (cmd.type === 'cursor' && cmd.position) {
      currentX = cmd.position.x
      currentY = cmd.position.y
    } else if (cmd.type === 'style') {
      if (cmd.command === 'reset') {
        currentStyle = {}
      } else if (cmd.style) {
        currentStyle = { ...currentStyle, ...cmd.style }
      }
    } else if (cmd.type === 'text' && cmd.text) {
      layout.push({
        text: cmd.text,
        x: currentX,
        y: currentY,
        style: { ...currentStyle }
      })
      // Advance cursor by text length
      currentX += cmd.text.length
    }
  }

  return layout
}

/**
 * Validate flex layout spacing
 */
export function validateFlexSpacing(
  layout: LayoutInfo[],
  direction: 'horizontal' | 'vertical',
  expectedGap?: number
): boolean {
  if (layout.length < 2) return true

  const positions = layout.map(item => 
    direction === 'horizontal' ? item.x : item.y
  )

  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1]
    if (expectedGap !== undefined && Math.abs(gap - expectedGap) > 1) {
      return false
    }
  }

  return true
}

/**
 * Create a visual representation of the layout for debugging
 */
export function visualizeLayout(layout: LayoutInfo[], width: number, height: number): string {
  const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '))

  for (const item of layout) {
    const chars = item.text.split('')
    for (let i = 0; i < chars.length; i++) {
      const x = item.x + i - 1 // Convert to 0-indexed
      const y = item.y - 1
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[y][x] = chars[i]
      }
    }
  }

  return grid.map(row => row.join('')).join('\n')
}