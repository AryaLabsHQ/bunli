import type { OutputFormat, OutputPolicy } from './types.js'

export interface ResolveFormatOptions {
  /** Explicit --format flag value, if provided. */
  flagFormat?: OutputFormat
  /** Command-level default format. */
  commandDefault?: OutputFormat
  /** Whether stdout is a TTY (human) or piped (agent). */
  isTTY: boolean
}

/**
 * Resolves the effective output format.
 *
 * Priority: explicit --format flag > command default > agent auto-json > toon.
 */
export function resolveFormat(options: ResolveFormatOptions): {
  format: OutputFormat
  formatExplicit: boolean
  agent: boolean
} {
  const agent = !options.isTTY
  const formatExplicit = options.flagFormat !== undefined

  if (formatExplicit) {
    return { format: options.flagFormat!, formatExplicit, agent }
  }

  if (options.commandDefault) {
    return { format: options.commandDefault, formatExplicit: false, agent }
  }

  // Agents get json by default
  if (agent) {
    return { format: 'json', formatExplicit: false, agent }
  }

  return { format: 'toon', formatExplicit: false, agent }
}

export interface ShouldRenderOutputOptions {
  /** Whether the consumer is human (TTY). */
  isTTY: boolean
  /** Whether --format was explicitly passed. */
  formatExplicit: boolean
  /** The command's output policy. */
  policy?: OutputPolicy
}

/**
 * Determines whether formatted output should be written to stdout.
 *
 * Returns false when policy is 'agent-only' and the consumer is a
 * human TTY without an explicit --format flag.
 */
export function shouldRenderOutput(options: ShouldRenderOutputOptions): boolean {
  if (options.policy === 'agent-only' && options.isTTY && !options.formatExplicit) {
    return false
  }
  return true
}
