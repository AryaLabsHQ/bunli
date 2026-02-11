import * as clackPrompts from '@clack/prompts'

/**
 * Bunli wrapper around @clack/prompts.
 *
 * Prefer importing from '@bunli/utils' (or using `prompt.clack`) so Bunli apps
 * don't take a direct dependency on @clack/prompts APIs.
 */
export { clackPrompts }

/**
 * Local cancel sentinel for Bunli helpers/tests.
 *
 * Note: @clack/prompts uses an internal `Symbol('clack:cancel')` that cannot be
 * constructed externally. We treat both as "cancel".
 */
export const CANCEL = Symbol.for('bunli:prompt_cancel')

export type Cancel = typeof CANCEL | symbol

export function isCancel(value: unknown): value is Cancel {
  return value === CANCEL || clackPrompts.isCancel(value)
}

export class PromptCancelledError extends Error {
  constructor(message = 'Cancelled') {
    super(message)
    this.name = 'PromptCancelledError'
  }
}

/**
 * Convert a cancel result into a typed error.
 * This is useful when you want to keep return types narrow but still allow
 * cancellation to be handled by the framework.
 */
export function assertNotCancelled<T>(value: T | Cancel, message?: string): T {
  if (isCancel(value)) throw new PromptCancelledError(message)
  return value
}

/**
 * Convert a cancel result into an immediate, clean exit (exit code 0).
 * Use this for apps that want "Ctrl+C just quits" semantics.
 */
export function promptOrExit<T>(value: T | Cancel, message?: string): T {
  if (isCancel(value)) {
    clackPrompts.cancel(message ?? 'Cancelled')
    process.exit(0)
  }
  return value
}

// Re-export commonly used prompt primitives under the Bunli namespace.
export const intro = clackPrompts.intro
export const outro = clackPrompts.outro
export const note = clackPrompts.note
export const log = clackPrompts.log
export const spinner = clackPrompts.spinner

export const text = clackPrompts.text
export const confirm = clackPrompts.confirm
export const select = clackPrompts.select
export const multiselect = clackPrompts.multiselect
export const password = clackPrompts.password

export const group = clackPrompts.group
export const groupMultiselect = clackPrompts.groupMultiselect

/**
 * Blessed Bunli namespace that wraps @clack/prompts and adds Bunli helpers.
 * This is the recommended import surface for Clack within Bunli projects.
 */
export const clack = {
  ...clackPrompts,
  CANCEL,
  isCancel,
  PromptCancelledError,
  assertNotCancelled,
  promptOrExit
} as const
