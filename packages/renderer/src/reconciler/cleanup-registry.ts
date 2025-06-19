/**
 * Automatic cleanup using FinalizationRegistry
 * This ensures terminal resources are properly cleaned up when components are garbage collected
 */

import type { TerminalContainer } from './terminal-element.js'
import { unmount } from './index.js'

// Check if FinalizationRegistry is available
const hasFinalizationRegistry = typeof FinalizationRegistry !== 'undefined'

/**
 * Cleanup data stored with containers
 */
interface CleanupData {
  stream?: any
  timers: Set<NodeJS.Timeout>
  resizeHandler?: () => void
}

// Map to store cleanup data
const cleanupDataMap = new WeakMap<TerminalContainer, CleanupData>()

/**
 * FinalizationRegistry for automatic cleanup
 */
let registry: FinalizationRegistry<CleanupData> | undefined

if (hasFinalizationRegistry) {
  registry = new FinalizationRegistry((cleanupData: CleanupData) => {
    // Clean up timers
    for (const timer of cleanupData.timers) {
      clearTimeout(timer)
    }
    
    // Remove resize handler if present
    if (cleanupData.stream && cleanupData.resizeHandler) {
      cleanupData.stream.off?.('resize', cleanupData.resizeHandler)
    }
    
    // Show cursor on cleanup
    if (cleanupData.stream?.write) {
      cleanupData.stream.write('\x1b[?25h')
    }
  })
}

/**
 * Register a container for automatic cleanup
 */
export function registerForCleanup(container: TerminalContainer): void {
  if (!registry) return
  
  const cleanupData: CleanupData = {
    stream: container.stream,
    timers: new Set(),
    resizeHandler: undefined
  }
  
  // Store cleanup data
  cleanupDataMap.set(container, cleanupData)
  
  // Register for cleanup
  registry.register(container, cleanupData, container)
}

/**
 * Add a timer to be cleaned up
 */
export function addTimer(container: TerminalContainer, timer: NodeJS.Timeout): void {
  const cleanupData = cleanupDataMap.get(container)
  if (cleanupData) {
    cleanupData.timers.add(timer)
  }
}

/**
 * Remove a timer from cleanup tracking
 */
export function removeTimer(container: TerminalContainer, timer: NodeJS.Timeout): void {
  const cleanupData = cleanupDataMap.get(container)
  if (cleanupData) {
    cleanupData.timers.delete(timer)
  }
}

/**
 * Set resize handler for cleanup
 */
export function setResizeHandler(container: TerminalContainer, handler: () => void): void {
  const cleanupData = cleanupDataMap.get(container)
  if (cleanupData) {
    cleanupData.resizeHandler = handler
  }
}

/**
 * Manual cleanup (called before GC)
 */
export function manualCleanup(container: TerminalContainer): void {
  // Unregister from finalization
  if (registry) {
    registry.unregister(container)
  }
  
  // Get and remove cleanup data
  const cleanupData = cleanupDataMap.get(container)
  if (cleanupData) {
    // Clean up timers
    for (const timer of cleanupData.timers) {
      clearTimeout(timer)
    }
    
    // Remove resize handler
    if (cleanupData.stream && cleanupData.resizeHandler) {
      cleanupData.stream.off?.('resize', cleanupData.resizeHandler)
    }
    
    cleanupDataMap.delete(container)
  }
  
  // Clean up renderers
  // Note: Renderers use WeakMap so they'll be GC'd automatically
}

/**
 * Create a self-cleaning terminal app wrapper
 */
export function createCleanupWrapper(app: any): any {
  if (!hasFinalizationRegistry) {
    return app
  }
  
  // Create a proxy that tracks cleanup
  return new Proxy(app, {
    get(target, prop) {
      if (prop === 'unmount') {
        return function() {
          // Call original unmount
          const result = target.unmount?.()
          
          // Manual cleanup
          if (target.container) {
            manualCleanup(target.container)
          }
          
          return result
        }
      }
      
      return target[prop]
    }
  })
}

/**
 * Check if FinalizationRegistry is supported
 */
export function isCleanupSupported(): boolean {
  return hasFinalizationRegistry
}

/**
 * Get cleanup statistics (for debugging)
 */
export function getCleanupStats(): { 
  supported: boolean
  trackedContainers: number 
} {
  let trackedContainers = 0
  
  // Count tracked containers (approximate, since WeakMap doesn't expose size)
  // This is mainly for debugging
  if (typeof cleanupDataMap !== 'undefined') {
    // We can't directly count WeakMap entries, but we can track this separately if needed
    trackedContainers = -1 // Indicates unknown
  }
  
  return {
    supported: hasFinalizationRegistry,
    trackedContainers
  }
}