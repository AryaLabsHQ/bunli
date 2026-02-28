import { rawSpinner, intro, outro, note, log, cancel, isCancel } from '../prompt/index.js'

export { intro, outro, note, log, cancel, isCancel }

export interface InlineSpinner {
  start(text?: string): void
  stop(text?: string): void
  succeed(text?: string): void
  fail(text?: string): void
  warn(text?: string): void
  info(text?: string): void
  update(text: string): void
}

export function spinner(): InlineSpinner {
  const s = rawSpinner()
  return {
    start(text) {
      s.start(text)
    },
    stop(text) {
      s.stop(text)
    },
    succeed(text) {
      s.stop(text)
    },
    fail(text) {
      s.stop(text)
    },
    warn(text) {
      s.stop(text)
    },
    info(text) {
      s.stop(text)
    },
    update(text) {
      s.message(text)
    }
  }
}
