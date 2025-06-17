import { prompt as promptFn, confirm, select, password } from './prompt.js'
import { createSpinner } from './spinner.js'
import { colors } from './colors.js'
import type { BunliUtils } from './types.js'

// Export all types
export * from './types.js'

// Create the main utilities object
export const utils: BunliUtils = {
  prompt: Object.assign(promptFn, {
    confirm,
    select,
    password
  }),
  spinner: createSpinner,
  colors
}

// Export individual utilities for convenience
export { colors } from './colors.js'
export { createSpinner as spinner } from './spinner.js'
export { prompt, confirm, select, password } from './prompt.js'