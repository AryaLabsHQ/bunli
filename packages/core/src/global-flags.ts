import { z } from 'zod'
import type { CLIOption } from './types.js'

/**
 * Built-in global flags available to all commands
 */
export const GLOBAL_FLAGS = {
  interactive: {
    schema: z.boolean().default(false),
    short: 'i',
    description: 'Run in interactive TUI mode'
  },
  tui: {
    schema: z.boolean().default(false),
    description: 'Force TUI mode (same as --interactive)'
  },
  'no-tui': {
    schema: z.boolean().default(false),
    description: 'Disable TUI mode, use CLI handler instead'
  },
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
  interactive: boolean
  tui: boolean
  'no-tui': boolean
  help: boolean
  version: boolean
}