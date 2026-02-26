// Re-export config utilities for use in bunli.config.ts files
export { loadConfig } from '@bunli/core'
export { defineConfig, type BunliConfig } from '@bunli/core'

// Re-export utilities
export { findEntry } from './utils/find-entry.js'

// Version info
export const version = '0.1.0'
