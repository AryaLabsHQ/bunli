/**
 * Supported output formats.
 */
export type OutputFormat = 'json' | 'yaml' | 'md' | 'toon'

/**
 * Controls when output data is displayed.
 * - 'all': display to both humans (TTY) and agents (piped).
 * - 'agent-only': suppress data in TTY mode; still emit for piped/agent consumers.
 */
export type OutputPolicy = 'all' | 'agent-only'

/**
 * Metadata envelope that wraps formatted output.
 */
export interface OutputMeta {
  /** The command that produced this output. */
  command: string
  /** Wall-clock duration in milliseconds. */
  durationMs?: number
}

/**
 * Structured output envelope for machine-consumable results.
 */
export interface OutputEnvelope<T = unknown> {
  ok: boolean
  data: T
  meta?: OutputMeta
}
