import type { Spinner, SpinnerOptions } from './types.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const CLEAR_LINE = '\x1b[2K'
const CURSOR_START = '\x1b[G'

export function createSpinner(options?: SpinnerOptions | string): Spinner {
  const config: SpinnerOptions = typeof options === 'string' 
    ? { text: options } 
    : options || {}
  
  let isSpinning = false
  let frameIndex = 0
  let intervalId: Timer | null = null
  let currentText: string = config.text || ''
  
  const render = (symbol: string, text: string) => {
    process.stdout.write(`${CLEAR_LINE}${CURSOR_START}${symbol} ${text}`)
  }
  
  const spinner: Spinner = {
    start(text?: string) {
      if (isSpinning) return
      
      isSpinning = true
      if (text !== undefined) {
        currentText = text
      }
      
      // Hide cursor
      process.stdout.write('\x1b[?25l')
      
      intervalId = setInterval(() => {
        const frame = SPINNER_FRAMES[frameIndex]!
        render(frame, currentText)
        frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length
      }, 80)
    },
    
    stop(text?: string) {
      if (!isSpinning) return
      
      isSpinning = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      
      // Clear line and show cursor
      process.stdout.write(CLEAR_LINE + CURSOR_START)
      process.stdout.write('\x1b[?25h')
      
      if (text) {
        console.log(text)
      }
    },
    
    succeed(text?: string) {
      this.stop()
      console.log(`✅ ${text || currentText}`)
    },
    
    fail(text?: string) {
      this.stop()
      console.log(`❌ ${text || currentText}`)
    },
    
    warn(text?: string) {
      this.stop()
      console.log(`⚠️  ${text || currentText}`)
    },
    
    info(text?: string) {
      this.stop()
      console.log(`ℹ️  ${text || currentText}`)
    },
    
    update(text: string) {
      currentText = text
      if (isSpinning) {
        render(SPINNER_FRAMES[frameIndex]!, currentText)
      }
    }
  }
  
  // Ensure spinner is stopped on process exit
  process.on('exit', () => spinner.stop())
  process.on('SIGINT', () => {
    spinner.stop()
    process.exit(0)
  })
  
  return spinner
}