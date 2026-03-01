import { spinner as promptSpinner, intro, outro, note, log, cancel, isCancel } from '../prompt/index.js'

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
  const s = promptSpinner()
  return {
    start(text) {
      s.start(text)
    },
    stop(text) {
      s.stop(text)
    },
    succeed(text) {
      s.succeed(text)
    },
    fail(text) {
      s.fail(text)
    },
    warn(text) {
      s.warn(text)
    },
    info(text) {
      s.info(text)
    },
    update(text) {
      s.update(text)
    }
  }
}
