/**
 * Logger implementation using the debug package
 *
 * Silent by default, enabled via:
 * - DEBUG=bunli:* (all namespaces)
 * - DEBUG=bunli:cli (specific namespace)
 */

import createDebug from 'debug'

export interface Logger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
}

export function createLogger(namespace: string): Logger {
  const debug = createDebug(`bunli:${namespace}`)

  return {
    info(message: string, ...args: any[]) {
      debug(message, ...args)
    },

    warn(message: string, ...args: any[]) {
      debug('[WARN]', message, ...args)
    },

    error(message: string, ...args: any[]) {
      debug('[ERROR]', message, ...args)
    },

    debug(message: string, ...args: any[]) {
      debug(message, ...args)
    }
  }
}
