import type {
  Spinner,
  SpinnerAnimation,
  SpinnerOptions,
  SpinnerSymbolMode
} from './types.js'

const CLEAR_LINE = '\x1b[2K'
const CURSOR_START = '\x1b[G'

const FRAMES: Record<SpinnerAnimation, string[]> = {
  // Use dense braille blocks with similar footprint to reduce perceived vertical jitter.
  braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  dots: ['.  ', '.. ', '...', ' ..', '  .'],
  line: ['-', '\\', '|', '/']
}

function resolveAnimation(options: SpinnerOptions): SpinnerAnimation {
  if (options.animation && options.animation in FRAMES) return options.animation
  const envAnimation = process.env.BUNLI_SPINNER_ANIMATION as SpinnerAnimation | undefined
  if (envAnimation && envAnimation in FRAMES) return envAnimation
  return 'braille'
}

function resolveSymbolMode(options: SpinnerOptions): SpinnerSymbolMode {
  const override = options.symbols ?? (process.env.BUNLI_SYMBOLS as SpinnerSymbolMode | undefined)
  if (override === 'ascii' || override === 'unicode') return override
  if (!process.stdout.isTTY) return 'ascii'
  return 'unicode'
}

function resolveStatusLabels(mode: SpinnerSymbolMode) {
  if (mode === 'unicode') {
    return {
      success: 'OK',
      error: 'ERR',
      warning: 'WARN',
      info: 'INFO'
    }
  }
  return {
    success: 'OK',
    error: 'ERR',
    warning: 'WARN',
    info: 'INFO'
  }
}

export function createSpinner(options?: SpinnerOptions | string): Spinner {
  const config: SpinnerOptions = typeof options === 'string'
    ? { text: options }
    : options ?? {}

  const animation = resolveAnimation(config)
  const frames = FRAMES[animation] ?? FRAMES.dots
  const intervalMs = config.intervalMs ?? 80
  const symbols = resolveStatusLabels(resolveSymbolMode(config))

  let isSpinning = false
  let frameIndex = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  let currentText = config.text ?? ''
  let startedAt = 0

  const elapsedSuffix = () =>
    config.showTimer && startedAt > 0 ? ` (${((Date.now() - startedAt) / 1000).toFixed(1)}s)` : ''

  const writeFrame = (frame: string, text: string) => {
    process.stdout.write(`${CLEAR_LINE}${CURSOR_START}${frame} ${text}${elapsedSuffix()}`)
  }

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const spinner: Spinner = {
    start(text?: string) {
      if (text !== undefined) currentText = text
      if (isSpinning) return

      startedAt = Date.now()
      isSpinning = true

      if (!process.stdout.isTTY) {
        if (currentText) console.log(`${symbols.info} ${currentText}`)
        return
      }

      writeFrame(frames[frameIndex] ?? '.', currentText)
      intervalId = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length
        writeFrame(frames[frameIndex] ?? '.', currentText)
      }, intervalMs)
    },

    stop(text?: string) {
      if (text !== undefined) currentText = text

      stopTimer()
      const wasSpinning = isSpinning
      isSpinning = false

      if (!process.stdout.isTTY) {
        if (wasSpinning && text) console.log(text)
        return
      }

      process.stdout.write(CLEAR_LINE + CURSOR_START)
      if (text) console.log(text)
    },

    succeed(text?: string) {
      this.stop()
      const value = text ?? currentText
      if (value) console.log(`${symbols.success} ${value}${elapsedSuffix()}`)
    },

    fail(text?: string) {
      this.stop()
      const value = text ?? currentText
      if (value) console.log(`${symbols.error} ${value}${elapsedSuffix()}`)
    },

    warn(text?: string) {
      this.stop()
      const value = text ?? currentText
      if (value) console.log(`${symbols.warning} ${value}${elapsedSuffix()}`)
    },

    info(text?: string) {
      this.stop()
      const value = text ?? currentText
      if (value) console.log(`${symbols.info} ${value}${elapsedSuffix()}`)
    },

    update(text: string) {
      currentText = text
      if (!isSpinning && process.stdout.isTTY) {
        this.start(text)
        return
      }
      if (isSpinning && process.stdout.isTTY) {
        writeFrame(frames[frameIndex] ?? '.', currentText)
      }
    }
  }

  if (config.text && process.stdout.isTTY) {
    spinner.start(config.text)
  }

  return spinner
}
