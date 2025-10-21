import { prompt as promptFn, confirm, select, password } from './prompt.js'
import type { PromptOptions, MultiSelectOptions } from './types.js'
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
    password,
    text: (message: string, options?: PromptOptions) => promptFn<string>(message, options),
    multiselect: async <T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]> => {
      // Fallback: use select repeatedly when a real multiselect UI isn't available
      const { options: choices } = options
      const selected: T[] = []
      console.log(message)
      for (const choice of choices) {
        const ok = await confirm(`Select ${choice.label}?`, { default: false })
        if (ok) selected.push(choice.value as T)
      }
      return selected
    }
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
  password,
  text: (message: string, options?: PromptOptions) => promptFn<string>(message, options),
  multiselect: async <T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]> => {
    const { options: choices } = options
    const selected: T[] = []
    console.log(message)
    for (const choice of choices) {
      const ok = await confirm(`Select ${choice.label}?`, { default: false })
      if (ok) selected.push(choice.value as T)
    }
    return selected
  }
}) as BunliUtils['prompt']

// Also export individual prompt methods
export { confirm, select, password } from './prompt.js'

// Export validation utilities
export { validate, validateFields } from './validation.js'
export { SchemaError, getDotPath } from '@standard-schema/utils'