export const logger = {
  debug: (...args: any[]) => {
    if (process.env.DEBUG) {
      console.log('[DEBUG]', ...args)
    }
  },
  
  info: (...args: any[]) => {
    console.log('[INFO]', ...args)
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}