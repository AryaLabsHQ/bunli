export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogOptions {
  level?: LogLevel
  timestamp?: boolean
  timestampFormat?: 'iso' | 'short' | 'time'
  prefix?: string
  separator?: string
  fields?: Record<string, string | number | boolean>
}

const LEVEL_STYLES: Record<LogLevel, { label: string; color: [number, number, number] }> = {
  debug: { label: 'DEBUG', color: [143, 161, 181] },
  info:  { label: 'INFO',  color: [106, 196, 255] },
  warn:  { label: 'WARN',  color: [249, 200, 91] },
  error: { label: 'ERROR', color: [255, 107, 107] },
  fatal: { label: 'FATAL', color: [201, 48, 48] },
}

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

function bold(s: string): string { return `${BOLD}${s}${RESET}` }
function dim(s: string): string { return `${DIM}${s}${RESET}` }
function colored(s: string, r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m${s}${RESET}`
}

function formatTimestamp(format: 'iso' | 'short' | 'time'): string {
  const now = new Date()
  switch (format) {
    case 'iso': return now.toISOString()
    case 'short': return now.toISOString().slice(0, 19)
    case 'time': return now.toTimeString().slice(0, 8)
  }
}

/**
 * Format a log message with level, optional timestamp, and structured fields.
 * Returns ANSI-styled string.
 */
export function formatLog(message: string, options: LogOptions = {}): string {
  const {
    level = 'info',
    timestamp = false,
    timestampFormat = 'short',
    prefix,
    separator = '=',
    fields
  } = options

  const style = LEVEL_STYLES[level]
  const parts: string[] = []

  // 1. Timestamp (dim)
  if (timestamp) {
    parts.push(dim(formatTimestamp(timestampFormat)))
  }

  // 2. Level label (colored)
  const levelStr = colored(style.label, ...style.color)
  if (level === 'fatal') {
    parts.push(bold(levelStr))
  } else {
    parts.push(levelStr)
  }

  // 3. Custom prefix
  if (prefix) {
    parts.push(dim(prefix))
  }

  // 4. Message
  parts.push(message)

  // 5. Structured fields (key=value, dimmed)
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      const formattedValue = typeof value === 'string' && value.includes(' ')
        ? `"${value}"`
        : String(value)
      parts.push(dim(`${key}${separator}${formattedValue}`))
    }
  }

  return parts.join(' ')
}

/**
 * Write a formatted log message to stderr.
 */
export function log(message: string, options?: LogOptions): void {
  process.stderr.write(formatLog(message, options) + '\n')
}
