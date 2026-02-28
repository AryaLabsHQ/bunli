import { appendFileSync } from 'node:fs'

function resolveDebugLogFile(): string {
  return (process.env.BUNLI_DEBUG_LOG_FILE ?? '').trim()
}

export function createDebugFileLogger(namespace: string): (message: string) => void {
  const file = resolveDebugLogFile()

  return (message: string) => {
    if (!file) return
    const line = `[${new Date().toISOString()} pid=${process.pid}] [${namespace}] ${message}`
    try {
      appendFileSync(file, `${line}\n`)
    } catch {
      // Ignore debug log write failures.
    }
  }
}
