import { appendFileSync } from 'node:fs'

const DEBUG_INPUT_FILE = (process.env.BUNLI_DEBUG_LOG_FILE ?? '').trim()

const DEBUG_NAMESPACES = new Set(
  String(process.env.BUNLI_DEBUG ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
)

const DEBUG_STDERR = DEBUG_NAMESPACES.has('tui:input')
export const DEBUG_VERBOSE = process.env.BUNLI_DEBUG_VERBOSE === '1'

const DEBUG_INPUTS = DEBUG_STDERR || DEBUG_INPUT_FILE.length > 0

export function formatDebugSequence(sequence: string): string {
  return sequence
    .replace(/\u001b/g, '\\u001b')
    .replace(/\u0003/g, '\\u0003')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}

export function isEscapeRawSequence(sequence: string): boolean {
  if (sequence === '\u001b' || sequence === '\u001b\u001b' || sequence === '\u001b[27u') return true
  return /^\u001b\[27;\d+;27~$/.test(sequence)
}

export function isCtrlCRawSequence(sequence: string): boolean {
  return sequence === '\u0003'
}

export function shouldLogRawSequence(sequence: string): boolean {
  if (DEBUG_VERBOSE) return true
  return isEscapeRawSequence(sequence) || isCtrlCRawSequence(sequence)
}

export function debugInput(message: string) {
  if (!DEBUG_INPUTS) return
  const line = `[${new Date().toISOString()} pid=${process.pid}] [bunli:tui:input] ${message}`
  if (DEBUG_STDERR) {
    process.stderr.write(`${line}\n`)
  }
  if (DEBUG_INPUT_FILE.length > 0) {
    try {
      appendFileSync(DEBUG_INPUT_FILE, `${line}\n`)
    } catch {
      // Avoid crashing prompt runtime on debug logging failures.
    }
  }
}
