import { prompt as promptFn, confirm, select, multiselect, password } from './prompt.js'
import type { PromptOptions } from './types.js'
import { createSpinner } from './spinner.js'
import { colors } from './colors.js'
import type { BunliUtils } from './types.js'
import { clack } from './prompts/clack.js'

// Export all types
export * from './types.js'
export * from './prompts/clack.js'

// Create the main utilities object
export const utils: BunliUtils = {
  prompt: Object.assign(promptFn, {
    confirm,
    select,
    multiselect,
    password,
    text: (message: string, options?: PromptOptions) => promptFn<string>(message, options),
    clack
  }),
  spinner: createSpinner,
  colors
}

// Export individual utilities for convenience
export { colors } from './colors.js'
export { createSpinner as spinner } from './spinner.js'

// Export prompt with attached methods
export const prompt = Object.assign(promptFn, {
  confirm,
  select,
  multiselect,
  password,
  text: (message: string, options?: PromptOptions) => promptFn<string>(message, options),
  clack
}) as BunliUtils['prompt']

// Also export individual prompt methods
export { confirm, select, multiselect, password } from './prompt.js'

// Export validation utilities
export { validate, validateFields } from './validation.js'
export { SchemaError, getDotPath } from '@standard-schema/utils'
