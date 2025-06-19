/**
 * Global test setup for @bunli/renderer tests
 */

import { beforeEach, afterEach } from "bun:test"

// Store active test apps for cleanup
const activeApps = new Set<{ unmount: () => void }>()

// Global cleanup function
export function cleanup() {
  activeApps.forEach(app => app.unmount())
  activeApps.clear()
}

// Register app for automatic cleanup
export function registerApp(app: { unmount: () => void }) {
  activeApps.add(app)
}

// Setup hooks
beforeEach(() => {
  // Reset any global state
  if (globalThis.mockTerminal) {
    globalThis.mockTerminal.reset()
  }
})

afterEach(() => {
  // Clean up any rendered apps
  cleanup()
})

// Extend global for mock terminal
declare global {
  var mockTerminal: any
}