import { PromptCancelledError } from '@bunli/tui/prompt'

interface InterruptControllerOptions {
  onLog?: (message: string) => void
}

export interface InterruptController {
  signal: AbortSignal
  raiseInterrupt: (message: string) => void
  attach: () => void
  detach: () => void
  race: <T>(work: Promise<T>) => Promise<T>
  isInterrupted: () => boolean
}

export function createInterruptController(options: InterruptControllerOptions = {}): InterruptController {
  const abortController = new AbortController()
  let interrupted = false
  let rejectInterrupted: ((error: PromptCancelledError) => void) | undefined

  const interruptedPromise = new Promise<never>((_resolve, reject) => {
    rejectInterrupted = reject
  })

  const raiseInterrupt = (message: string) => {
    if (interrupted) return
    interrupted = true
    options.onLog?.(`raiseInterrupt message="${message}"`)
    abortController.abort(message)
    rejectInterrupted?.(new PromptCancelledError(message))
  }

  const onSigint = () => raiseInterrupt('Cancelled')
  const onSigterm = () => raiseInterrupt('Terminated')

  const attach = () => {
    process.on('SIGINT', onSigint)
    process.on('SIGTERM', onSigterm)
  }

  const detach = () => {
    process.off('SIGINT', onSigint)
    process.off('SIGTERM', onSigterm)
  }

  const race = async <T>(work: Promise<T>): Promise<T> => {
    return Promise.race([work, interruptedPromise])
  }

  return {
    signal: abortController.signal,
    raiseInterrupt,
    attach,
    detach,
    race,
    isInterrupted: () => interrupted
  }
}
