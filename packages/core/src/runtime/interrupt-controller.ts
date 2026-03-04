import { PromptCancelledError } from '@bunli/runtime'

interface InterruptControllerOptions {
  onLog?: (message: string) => void
}

export class ProcessTerminatedError extends Error {
  constructor(message = 'Terminated') {
    super(message)
    this.name = 'ProcessTerminatedError'
  }
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
  let rejectInterrupted: ((error: PromptCancelledError | ProcessTerminatedError) => void) | undefined

  const interruptedPromise = new Promise<never>((_resolve, reject) => {
    rejectInterrupted = reject
  })
  // Prevent unhandled rejections if `work` wins the race and an interrupt arrives later.
  interruptedPromise.catch(() => {})

  const raiseInterrupt = (message: string, kind: 'cancel' | 'terminate' = 'cancel') => {
    if (interrupted) return
    interrupted = true
    options.onLog?.(`raiseInterrupt message="${message}"`)
    abortController.abort(message)
    if (kind === 'terminate') {
      rejectInterrupted?.(new ProcessTerminatedError(message))
      return
    }
    rejectInterrupted?.(new PromptCancelledError(message))
  }

  const onSigint = () => raiseInterrupt('Cancelled', 'cancel')
  const onSigterm = () => raiseInterrupt('Terminated', 'terminate')

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
