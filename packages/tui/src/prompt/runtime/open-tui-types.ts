export const OPEN_TUI_CANCEL = Symbol.for('bunli:prompt_cancel')

export type OpenTuiCancel = typeof OPEN_TUI_CANCEL

export type PromptResolver<T> = (value: T | OpenTuiCancel) => void

export interface OpenTuiSelectOption<T = string> {
  label: string
  value: T
  hint?: string
  disabled?: boolean
}
