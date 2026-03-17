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
  },
  'image-mode': {
    schema: z.enum(['off', 'auto', 'on']).optional(),
    description: 'Terminal image preview mode (off|auto|on)'
  },
  format: {
    schema: z.enum(['json', 'yaml', 'md', 'toon']).optional(),
    description: 'Output format (json|yaml|md|toon)'
  },
  verbose: {
    schema: z.boolean().default(false),
    description: 'Enable verbose output'
  },
  quiet: {
    schema: z.boolean().default(false),
    short: 'q',
    description: 'Suppress non-essential output'
  },
  llms: {
    schema: z.boolean().default(false),
    description: 'Print compact command manifest (Markdown)'
  },
  'llms-full': {
    schema: z.boolean().default(false),
    description: 'Print full command manifest (Markdown)'
  }
} satisfies Record<string, CLIOption>

export type GlobalFlags = {
  help: boolean
  version: boolean
  'image-mode'?: 'off' | 'auto' | 'on'
  format?: 'json' | 'yaml' | 'md' | 'toon'
  verbose: boolean
  quiet: boolean
  llms: boolean
  'llms-full': boolean
}
