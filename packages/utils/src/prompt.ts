import type { PromptOptions, ConfirmOptions, SelectOptions, SelectOption } from './types.js'

// ANSI escape codes
const ESC = '\x1b'
const CSI = `${ESC}[`
const CLEAR_LINE = `${CSI}2K`
const CURSOR_START = `${CSI}G`
const CURSOR_HIDE = `${CSI}?25l`
const CURSOR_SHOW = `${CSI}?25h`

async function readline(prompt: string): Promise<string> {
  process.stdout.write(prompt)
  
  for await (const line of console) {
    return line
  }
  
  return ''
}

export async function prompt(message: string, options: PromptOptions = {}): Promise<string> {
  const defaultHint = options.default ? ` (${options.default})` : ''
  const promptText = `${message}${defaultHint} `
  
  while (true) {
    const input = await readline(promptText)
    const value = input.trim() || options.default || ''
    
    if (options.validate) {
      const result = options.validate(value)
      if (result === true) {
        return value
      } else if (typeof result === 'string') {
        console.error(`✗ ${result}`)
        continue
      } else {
        console.error('✗ Invalid input')
        continue
      }
    }
    
    return value
  }
}

export async function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const defaultHint = options.default === true ? 'Y/n' : options.default === false ? 'y/N' : 'y/n'
  const promptText = `${message} (${defaultHint}) `
  
  while (true) {
    const input = await readline(promptText)
    const value = input.trim().toLowerCase()
    
    if (!value && options.default !== undefined) {
      return options.default
    }
    
    if (value === 'y' || value === 'yes') {
      return true
    }
    
    if (value === 'n' || value === 'no') {
      return false
    }
    
    console.error('✗ Please answer with y/yes or n/no')
  }
}

export async function select<T = string>(message: string, options: SelectOptions<T>): Promise<T> {
  const { options: choices, default: defaultValue } = options
  let selectedIndex = defaultValue ? choices.findIndex(opt => opt.value === defaultValue) : 0
  if (selectedIndex === -1) selectedIndex = 0
  
  console.log(message)
  process.stdout.write(CURSOR_HIDE)
  
  // Draw initial options
  drawOptions(choices, selectedIndex)
  
  return new Promise((resolve) => {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    
    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write(CURSOR_SHOW)
    }
    
    process.stdin.on('data', (data) => {
      const key = data.toString()
      
      // Handle arrow keys
      if (key === '\x1b[A') { // Up arrow
        selectedIndex = Math.max(0, selectedIndex - 1)
        drawOptions(choices, selectedIndex)
      } else if (key === '\x1b[B') { // Down arrow
        selectedIndex = Math.min(choices.length - 1, selectedIndex + 1)
        drawOptions(choices, selectedIndex)
      } else if (key === '\r' || key === '\n') { // Enter
        cleanup()
        // Clear the options and show final selection
        for (let i = 0; i < choices.length; i++) {
          process.stdout.write(`${CSI}1A${CLEAR_LINE}`)
        }
        const selected = choices[selectedIndex]
        if (selected) {
          console.log(`✓ ${selected.label}`)
          resolve(selected.value)
        }
      } else if (key === '\x03' || key === '\x1b') { // Ctrl+C or Escape
        cleanup()
        process.exit(0)
      }
    })
  })
}

function drawOptions<T>(options: SelectOption<T>[], selectedIndex: number) {
  // Move cursor to beginning of options
  for (let i = 0; i < options.length; i++) {
    process.stdout.write(`${CSI}1A`)
  }
  
  // Draw each option
  options.forEach((option, index) => {
    process.stdout.write(CLEAR_LINE + CURSOR_START)
    const prefix = index === selectedIndex ? '❯ ' : '  '
    const hint = option.hint ? ` (${option.hint})` : ''
    console.log(`${prefix}${option.label}${hint}`)
  })
}

export async function password(message: string, options: PromptOptions = {}): Promise<string> {
  process.stdout.write(message + ' ')
  
  return new Promise((resolve) => {
    let input = ''
    
    process.stdin.setRawMode(true)
    process.stdin.resume()
    
    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      console.log() // New line after password
    }
    
    process.stdin.on('data', (data) => {
      const key = data.toString()
      
      if (key === '\r' || key === '\n') { // Enter
        cleanup()
        
        if (options.validate) {
          const result = options.validate(input)
          if (result === true) {
            resolve(input)
          } else {
            const errorMsg = typeof result === 'string' ? result : 'Invalid input'
            console.error(`✗ ${errorMsg}`)
            // Recursively call password prompt again
            password(message, options).then(resolve)
          }
        } else {
          resolve(input)
        }
      } else if (key === '\x03') { // Ctrl+C
        cleanup()
        process.exit(0)
      } else if (key === '\x7f' || key === '\b') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1)
          process.stdout.write('\b \b')
        }
      } else if (key.length === 1 && key >= ' ') { // Regular character
        input += key
        process.stdout.write('*')
      }
    })
  })
}