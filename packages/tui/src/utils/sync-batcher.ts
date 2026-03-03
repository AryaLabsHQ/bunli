export interface SyncBatcherOptions {
  /**
   * Flush scheduling strategy.
   * - "sync" flushes immediately when enqueue is called.
   * - "microtask" batches updates in the current tick.
   * - "timeout" batches updates in a setTimeout callback.
   */
  mode?: 'sync' | 'microtask' | 'timeout'
  /**
   * Timeout used when mode="timeout".
   */
  delayMs?: number
}

export interface SyncBatcher<TAction> {
  enqueue(action: TAction): void
  flush(): void
  clear(): void
  size(): number
  dispose(): void
}

export function createSyncBatcher<TAction>(
  applyBatch: (actions: TAction[]) => void,
  options: SyncBatcherOptions = {}
): SyncBatcher<TAction> {
  const mode = options.mode ?? 'microtask'
  const delayMs = options.delayMs ?? 0

  let queue: TAction[] = []
  let scheduled = false
  let disposed = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    if (disposed) return
    if (queue.length === 0) {
      scheduled = false
      return
    }

    const batch = queue
    queue = []
    scheduled = false
    timeoutId = null
    applyBatch(batch)
  }

  const schedule = () => {
    if (scheduled || disposed) return
    scheduled = true

    if (mode === 'sync') {
      flush()
      return
    }

    if (mode === 'timeout') {
      timeoutId = setTimeout(() => flush(), delayMs)
      return
    }

    queueMicrotask(() => flush())
  }

  return {
    enqueue(action) {
      if (disposed) return
      queue.push(action)
      schedule()
    },
    flush,
    clear() {
      queue = []
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      scheduled = false
    },
    size() {
      return queue.length
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      queue = []
      scheduled = false
    }
  }
}
