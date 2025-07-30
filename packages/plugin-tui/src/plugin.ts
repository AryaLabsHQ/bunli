import type { Command } from '@bunli/core'
import { createPlugin, type BunliPlugin } from '@bunli/core/plugin'
import { createCliRenderer } from '@opentui/core'
import type { TuiStore, TuiPluginOptions } from './types.js'
import { SchemaUIMapper } from './schema/mapper.js'
import { Form } from './components/Form.js'
import { applyTheme, getDefaultTheme } from './utils/theme.js'

export function tuiPlugin(options: TuiPluginOptions = {}): BunliPlugin<TuiStore> {
  return createPlugin<TuiStore>({
    name: '@bunli/plugin-tui',
    
    store: {
      renderer: null,
      activeView: null,
      formValues: new Map(),
      options: {
        autoForm: true,
        ...options
      }
    },
    
    async beforeCommand({ store, flags, commandDef, args }) {
      // Check if TUI should be activated
      const shouldUseTui = flags.interactive || flags.tui
      
      if (!shouldUseTui) {
        return
      }
      
      // Initialize renderer
      store.renderer = await createCliRenderer({
        exitOnCtrlC: store.options.renderer?.exitOnCtrlC ?? false,
        targetFps: store.options.renderer?.fps || 30,
        enableMouseMovement: store.options.renderer?.mouseSupport ?? true
      })
      
      // Apply theme
      const theme = typeof store.options.theme === 'string' 
        ? getDefaultTheme(store.options.theme)
        : store.options.theme || getDefaultTheme('dark')
      
      applyTheme(store.renderer, theme)
      
      // Check if command has custom TUI
      if (commandDef.tui && typeof commandDef.tui === 'function') {
        // Use custom TUI
        const customUI = await commandDef.tui({ store, command: commandDef, args })
        store.activeView = customUI
        store.renderer.add(customUI)
        store.renderer.start()
      } else if (store.options.autoForm !== false && commandDef.options && Object.keys(commandDef.options).length > 0) {
        // Generate form from command schema
        const form = await generateCommandForm(commandDef)
        store.activeView = form
        store.renderer.add(form)
        
        // Setup global keyboard shortcuts
        setupGlobalShortcuts(store)
        
        // Start renderer
        store.renderer.start()
        
        try {
          // Wait for form submission
          const values = await form.waitForSubmit()
          
          // Stop renderer before command executes
          store.renderer.stop()
          store.renderer.remove(form.id)
          
          // Merge form values into flags
          Object.assign(flags, values)
          
          // Clear the form from renderer
          store.activeView = null
        } catch (error) {
          // Form was cancelled
          store.renderer.stop()
          throw new Error('Operation cancelled')
        }
      } else {
        // No form needed, just start renderer for command to use
        store.renderer.start()
      }
    },
    
    async afterCommand({ store, result, error }) {
      if (store.renderer) {
        // Show result/error if still in TUI mode
        if (store.activeView && error) {
          // TODO: Show error in TUI
          console.error('Command error:', error)
        }
        
        // Cleanup
        if (store.renderer.isRunning) {
          store.renderer.stop()
        }
        store.renderer = null
        store.activeView = null
        store.formValues.clear()
      }
    },
    
    // Note: onError is not part of the BunliPlugin interface
    // We'll handle errors in afterCommand instead
  })
}

async function generateCommandForm(command: Command<any, any>): Promise<Form> {
  const mapper = new SchemaUIMapper()
  return mapper.createFormFromCommand(command)
}

function setupGlobalShortcuts(store: TuiStore) {
  if (!store.renderer) return
  
  // Default shortcuts
  const shortcuts: Record<string, () => void> = {
    'ctrl+c': () => {
      if (store.renderer?.isRunning) {
        store.renderer.stop()
      }
      process.exit(0)
    },
    ...(store.options.shortcuts || {})
  }
  
  store.renderer.on('key', (key: any) => {
    const keyStr = formatKey(key)
    const handler = shortcuts[keyStr]
    if (handler) {
      handler()
    }
  })
}

function formatKey(key: any): string {
  const parts = []
  if (key.ctrl) parts.push('ctrl')
  if (key.meta) parts.push('meta')
  if (key.shift) parts.push('shift')
  parts.push(key.name || key.sequence)
  return parts.join('+')
}