// Simple TUI implementation using ANSI escape codes
// This demonstrates TUI concepts without requiring OpenTUI

const ESC = '\x1b'
const CSI = `${ESC}[`

export const ansi = {
  // Cursor control
  clearScreen: () => `${CSI}2J${CSI}H`,
  moveTo: (x: number, y: number) => `${CSI}${y};${x}H`,
  hideCursor: () => `${CSI}?25l`,
  showCursor: () => `${CSI}?25h`,
  
  // Colors
  reset: () => `${CSI}0m`,
  bold: () => `${CSI}1m`,
  dim: () => `${CSI}2m`,
  
  // Foreground colors
  fg: {
    black: () => `${CSI}30m`,
    red: () => `${CSI}31m`,
    green: () => `${CSI}32m`,
    yellow: () => `${CSI}33m`,
    blue: () => `${CSI}34m`,
    magenta: () => `${CSI}35m`,
    cyan: () => `${CSI}36m`,
    white: () => `${CSI}37m`,
  },
  
  // Background colors
  bg: {
    black: () => `${CSI}40m`,
    red: () => `${CSI}41m`,
    green: () => `${CSI}42m`,
    yellow: () => `${CSI}43m`,
    blue: () => `${CSI}44m`,
    magenta: () => `${CSI}45m`,
    cyan: () => `${CSI}46m`,
    white: () => `${CSI}47m`,
  }
}

export function drawBox(x: number, y: number, width: number, height: number, title?: string) {
  let output = ''
  
  // Top border
  output += ansi.moveTo(x, y)
  output += '┌'
  if (title) {
    const titleStr = ` ${title} `
    const leftPadding = Math.floor((width - 2 - titleStr.length) / 2)
    output += '─'.repeat(leftPadding)
    output += titleStr
    output += '─'.repeat(width - 2 - leftPadding - titleStr.length)
  } else {
    output += '─'.repeat(width - 2)
  }
  output += '┐'
  
  // Sides
  for (let i = 1; i < height - 1; i++) {
    output += ansi.moveTo(x, y + i) + '│'
    output += ansi.moveTo(x + width - 1, y + i) + '│'
  }
  
  // Bottom border
  output += ansi.moveTo(x, y + height - 1)
  output += '└' + '─'.repeat(width - 2) + '┘'
  
  return output
}

export function drawText(x: number, y: number, text: string, color?: string) {
  let output = ansi.moveTo(x, y)
  if (color && ansi.fg[color as keyof typeof ansi.fg]) {
    output += ansi.fg[color as keyof typeof ansi.fg]()
  }
  output += text
  output += ansi.reset()
  return output
}

export function drawProgressBar(x: number, y: number, width: number, progress: number, label?: string) {
  const filledWidth = Math.floor((width - 2) * progress)
  const emptyWidth = width - 2 - filledWidth
  
  let output = ansi.moveTo(x, y)
  output += '['
  output += ansi.fg.green()
  output += '█'.repeat(filledWidth)
  output += ansi.reset()
  output += ' '.repeat(emptyWidth)
  output += ']'
  
  if (label) {
    output += ` ${label}`
  }
  
  return output
}

export function drawMenu(x: number, y: number, items: string[], selectedIndex: number) {
  let output = ''
  
  items.forEach((item, index) => {
    output += ansi.moveTo(x, y + index)
    if (index === selectedIndex) {
      output += ansi.bg.blue() + ansi.fg.white()
      output += `> ${item} `
      output += ansi.reset()
    } else {
      output += `  ${item} `
    }
  })
  
  return output
}

export class SimpleTUI {
  private isRunning = false
  private renderInterval?: Timer
  
  constructor(
    private render: () => string,
    private fps: number = 30
  ) {}
  
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    process.stdout.write(ansi.clearScreen())
    process.stdout.write(ansi.hideCursor())
    
    // Set up input handling
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    // Render loop
    this.renderInterval = setInterval(() => {
      const frame = this.render()
      process.stdout.write(ansi.clearScreen() + frame)
    }, 1000 / this.fps)
    
    // Cleanup on exit
    process.on('SIGINT', () => this.stop())
  }
  
  stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    if (this.renderInterval) {
      clearInterval(this.renderInterval)
    }
    
    process.stdout.write(ansi.showCursor())
    process.stdout.write(ansi.clearScreen())
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.exit(0)
  }
}