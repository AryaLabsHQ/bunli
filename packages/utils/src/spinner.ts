import { spinner as tuiSpinner } from '@bunli/tui/prompt'
import type { Spinner, SpinnerOptions } from './types.js'

export function createSpinner(options?: SpinnerOptions | string): Spinner {
  const config: SpinnerOptions = typeof options === 'string'
    ? { text: options }
    : options ?? {}

  const spinner = tuiSpinner({
    text: config.text,
    animation: config.animation,
    showTimer: config.showTimer,
    intervalMs: config.intervalMs
  })

  return {
    start(text) {
      spinner.start(text)
    },
    stop(text) {
      spinner.stop(text)
    },
    succeed(text) {
      spinner.succeed(text)
    },
    fail(text) {
      spinner.fail(text)
    },
    warn(text) {
      spinner.warn(text)
    },
    info(text) {
      spinner.info(text)
    },
    update(text) {
      spinner.update(text)
    }
  }
}
