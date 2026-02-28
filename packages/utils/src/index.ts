import { createSpinner } from './spinner.js'
import { colors } from './colors.js'
import type { BunliUtils } from './types.js'

export * from './types.js'

export const utils: BunliUtils = {
  spinner: createSpinner,
  colors
}

export { colors } from './colors.js'
export { createSpinner as spinner } from './spinner.js'

export { validate, validateFields } from './validation.js'
export { SchemaError, getDotPath } from '@standard-schema/utils'
