interface MetricsRecorder {
  recordEvent: (name: string, data?: Record<string, unknown>) => void
}

interface MetricsStore {
  metrics: MetricsRecorder
}

interface ConfigStore {
  config: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function hasMetricsStore(store: unknown): store is MetricsStore {
  if (!isRecord(store)) return false
  const metrics = store.metrics
  if (!isRecord(metrics)) return false
  return typeof metrics.recordEvent === 'function'
}

export function hasConfigStore(store: unknown): store is ConfigStore {
  if (!isRecord(store)) return false
  return 'config' in store
}
