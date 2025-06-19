/**
 * Bunli UI Plugin - Integrates React terminal UI into Bunli commands
 */

import { createPlugin } from '@bunli/core/plugin'
import { createApp, type TerminalApp } from '@bunli/renderer'
import type { ReactElement } from 'react'

export interface UIStore {
  activeApp: TerminalApp | null
  isInteractive: boolean
}

export interface UIContext {
  /**
   * Render a React element to the terminal
   */
  render: (element: ReactElement) => Promise<void>
  
  /**
   * Unmount the current UI
   */
  unmount: () => void
  
  /**
   * Update the current UI with new props
   */
  update: (element: ReactElement) => void
  
  /**
   * Wait for the user to exit (Ctrl+C)
   */
  waitForExit: () => Promise<void>
  
  /**
   * Check if UI is currently active
   */
  isActive: () => boolean
}

export const uiPlugin = createPlugin<UIStore>({
  name: '@bunli/plugin-ui',
  version: '0.0.1',
  
  store: {
    activeApp: null,
    isInteractive: false
  },
  
  beforeCommand({ store, command }) {
    // Create UI context
    const ui: UIContext = {
      async render(element: ReactElement) {
        // Clean up any existing UI
        if (store.activeApp) {
          store.activeApp.unmount()
        }
        
        // Create and render new UI
        const app = createApp(element)
        store.activeApp = app
        store.isInteractive = true
        app.render()
        
        // Wait a tick to ensure UI is rendered
        await new Promise(resolve => setImmediate(resolve))
      },
      
      unmount() {
        if (store.activeApp) {
          store.activeApp.unmount()
          store.activeApp = null
          store.isInteractive = false
        }
      },
      
      update(element: ReactElement) {
        if (store.activeApp) {
          // Re-render with new element
          store.activeApp.render()
        }
      },
      
      async waitForExit() {
        return new Promise((resolve) => {
          const cleanup = () => {
            process.removeListener('SIGINT', handleExit)
            process.removeListener('SIGTERM', handleExit)
          }
          
          const handleExit = () => {
            cleanup()
            this.unmount()
            resolve()
          }
          
          process.on('SIGINT', handleExit)
          process.on('SIGTERM', handleExit)
        })
      },
      
      isActive() {
        return store.isInteractive && store.activeApp !== null
      }
    }
    
    // Extend command context with UI
    ;(command as any).ui = ui
  },
  
  afterCommand({ store }) {
    // Clean up UI after command completes
    if (store.activeApp) {
      store.activeApp.unmount()
      store.activeApp = null
      store.isInteractive = false
    }
  }
})

// Export helpers
export { 
  defineUICommand, 
  defineComponentCommand, 
  defineRoutedCommand,
  withUI 
} from './helpers.js'
export type { UIHandlerArgs, Route } from './helpers.js'

// Type augmentation for commands
declare module '@bunli/core' {
  interface HandlerArgs {
    ui: UIContext
  }
}