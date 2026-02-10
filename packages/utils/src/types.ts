import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { clack as bunliClack } from './prompts/clack.js'

// Prompt types
export interface PromptOptions {
  default?: string
  validate?: (input: string) => boolean | string
  schema?: StandardSchemaV1  // Optional schema for validation
  placeholder?: string
  multiline?: boolean
}

export interface ConfirmOptions {
  default?: boolean
}

export interface SelectOption<T = string> {
  label: string
  value: T
  hint?: string
  disabled?: boolean
}

export interface SelectOptions<T = string> {
  options: SelectOption<T>[]
  default?: T
  hint?: string
}

export interface MultiSelectOptions<T = string> extends SelectOptions<T> {
  min?: number
  max?: number
  initialValues?: T[]
}

// Spinner types
export interface SpinnerOptions {
  text?: string
  color?: string
}

export interface Spinner {
  start(text?: string): void
  stop(text?: string): void
  succeed(text?: string): void
  fail(text?: string): void
  warn(text?: string): void
  info(text?: string): void
  update(text: string): void
}

// Color types (using Bun's built-in colors)
export type ColorFunction = (text: string) => string

export interface Colors {
  // Basic colors
  black: ColorFunction
  red: ColorFunction
  green: ColorFunction
  yellow: ColorFunction
  blue: ColorFunction
  magenta: ColorFunction
  cyan: ColorFunction
  white: ColorFunction
  gray: ColorFunction
  
  // Bright colors
  brightRed: ColorFunction
  brightGreen: ColorFunction
  brightYellow: ColorFunction
  brightBlue: ColorFunction
  brightMagenta: ColorFunction
  brightCyan: ColorFunction
  brightWhite: ColorFunction
  
  // Background colors
  bgRed: ColorFunction
  bgGreen: ColorFunction
  bgYellow: ColorFunction
  bgBlue: ColorFunction
  bgMagenta: ColorFunction
  bgCyan: ColorFunction
  bgWhite: ColorFunction
  
  // Styles
  bold: ColorFunction
  dim: ColorFunction
  italic: ColorFunction
  underline: ColorFunction
  strikethrough: ColorFunction
  
  // Utilities
  reset: ColorFunction
  strip: (text: string) => string
}

// Main utilities interface
export interface BunliUtils {
  prompt: {
    <T = string>(message: string, options?: PromptOptions): Promise<T>
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>
    select<T = string>(message: string, options: SelectOptions<T>): Promise<T>
    password<T = string>(message: string, options?: PromptOptions): Promise<T>
    text(message: string, options?: PromptOptions): Promise<string>
    multiselect<T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]>
    clack: typeof bunliClack
  }
  spinner: (options?: SpinnerOptions | string) => Spinner
  colors: Colors
}
