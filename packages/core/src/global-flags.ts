import { z } from 'zod'
import type { CLIOption } from './types.js'

/**
 * Built-in global flags available to all commands
 */
export const GLOBAL_FLAGS = {
  help: {
    schema: z.boolean().default(false),
    short: 'h',
    description: 'Show help'
  },
  version: {
    schema: z.boolean().default(false),
    short: 'v',
    description: 'Show version'
  }
} satisfies Record<string, CLIOption>

export type GlobalFlags = {
  help: boolean
  version: boolean
}
