// Re-export config utilities for use in bunli.config.ts files
export { defineConfig, loadConfig, type BunliConfig } from './config.js'

// Re-export utilities
export { findEntry } from './utils/find-entry.js'

// Version info
export const version = '0.1.0'