/**
 * Simple logger implementation
 */

export interface Logger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`
  const debugEnabled = process.env.BUNLI_DEBUG === 'true' || 
                      process.env.BUNLI_DEBUG?.includes(namespace)
  const silent = process.env.BUNLI_SILENT === 'true' || process.env.NODE_ENV === 'test'
  
  return {
    info(message: string, ...args: any[]) {
      if (!silent) {
        console.log(prefix, message, ...args)
      }
    },
    
    warn(message: string, ...args: any[]) {
      if (!silent) {
        console.warn(prefix, message, ...args)
      }
    },
    
    error(message: string, ...args: any[]) {
      if (!silent) {
        console.error(prefix, message, ...args)
      }
    },
    
    debug(message: string, ...args: any[]) {
      if (debugEnabled && !silent) {
        console.log(`${prefix} [DEBUG]`, message, ...args)
      }
    }
  }
}