/**
 * Terminal UI Renderer using React Reconciler
 */

import ReactReconciler from 'react-reconciler'
import { terminalHostConfig } from './host-config.js'
import { createTerminalContainer, type TerminalContainer } from './terminal-element.js'
import { performLayout } from './layout.js'
import { renderToTerminal } from './terminal-renderer.js'

// Create the reconciler instance
const reconciler = ReactReconciler(terminalHostConfig)

// Enable React DevTools (for browser environments)
if (typeof globalThis !== 'undefined' && (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  reconciler.injectIntoDevTools({
    bundleType: 1, // 0 for prod, 1 for dev
    version: '0.0.1',
    rendererPackageName: '@bunli/renderer',
  })
}

// Container to fiber root mapping
const containerToRoot = new WeakMap<TerminalContainer, any>()

/**
 * Terminal UI render function
 */
export function render(
  element: React.ReactElement,
  container?: TerminalContainer | NodeJS.WriteStream
): void {
  // Create or get container
  let terminalContainer: TerminalContainer
  
  if (!container) {
    terminalContainer = createTerminalContainer()
  } else if ('write' in container) {
    terminalContainer = createTerminalContainer(container)
  } else {
    terminalContainer = container
  }
  
  // Get or create fiber root
  let root = containerToRoot.get(terminalContainer)
  
  if (!root) {
    // Create a new root
    root = reconciler.createContainer(
      terminalContainer,
      0, // tag
      null, // hydration callbacks
      false, // isStrictMode
      null, // concurrentUpdatesByDefaultOverride
      '', // identifierPrefix
      (error: Error) => console.error('React error:', error), // onRecoverableError
      null // transitionCallbacks
    )
    
    containerToRoot.set(terminalContainer, root)
  }
  
  // Update the root
  reconciler.updateContainer(element, root, null, () => {
    // Initial render callback
  })
}

/**
 * Unmount and cleanup
 */
export function unmount(container: TerminalContainer): void {
  const root = containerToRoot.get(container)
  
  if (root) {
    reconciler.updateContainer(null, root, null, () => {
      containerToRoot.delete(container)
      
      // Clear terminal
      if (container.stream) {
        // Move cursor to top and clear screen
        container.stream.write('\x1b[H\x1b[2J')
      }
    })
  }
}

/**
 * Create a terminal UI app
 */
export interface TerminalApp {
  render(): void
  unmount(): void
  container: TerminalContainer
}

export function createApp(
  element: React.ReactElement,
  stream: NodeJS.WriteStream = process.stdout
): TerminalApp {
  const container = createTerminalContainer(stream)
  
  // Handle terminal resize
  const handleResize = () => {
    const newWidth = stream.columns || 80
    const newHeight = stream.rows || 24
    
    container.width = newWidth
    container.height = newHeight
    container.dirtyTracker.resize(newWidth, newHeight)
    
    // Re-render on resize
    render(element, container)
  }
  
  stream.on('resize', handleResize)
  
  // Hide terminal cursor on start
  stream.write('\x1b[?25l')
  
  // Ensure cleanup on exit
  const cleanup = () => {
    unmount(container)
    // Show cursor before exit
    stream.write('\x1b[?25h')
  }
  
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)
  
  return {
    render() {
      render(element, container)
    },
    
    unmount() {
      stream.off('resize', handleResize)
      process.removeListener('SIGINT', cleanup)
      process.removeListener('SIGTERM', cleanup)
      unmount(container)
    },
    
    container,
  }
}

// Export reconciler for advanced usage
export { reconciler }