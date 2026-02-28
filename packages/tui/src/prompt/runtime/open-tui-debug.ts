import createDebug from 'debug'

const inputDebug = createDebug('bunli:tui:input')
const verboseInputDebug = createDebug('bunli:tui:input:verbose')

const DEBUG_INPUTS = inputDebug.enabled || verboseInputDebug.enabled
export const DEBUG_VERBOSE = verboseInputDebug.enabled

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
  if (!DEBUG_INPUTS) return false
  if (DEBUG_VERBOSE) return true
  return isEscapeRawSequence(sequence) || isCtrlCRawSequence(sequence)
}

export function debugInput(message: string) {
  if (!DEBUG_INPUTS) return
  inputDebug(message)
}
