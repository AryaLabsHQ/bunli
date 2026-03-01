import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { hasConfigStore, hasMetricsStore } from './store-guards.js'

const startCommand = defineCommand({
  name: 'start',
  description: 'Start development server with hot reload',
  options: {
    port: option(
      z.coerce.number().min(1000).max(65535).default(3000),
      { 
        description: 'Port to run the server on',
        short: 'p'
      }
    ),
    host: option(
      z.string().default('localhost'),
      { 
        description: 'Host to bind the server to',
        short: 'h'
      }
    ),
    watch: option(
      z.boolean().default(true),
      { 
        description: 'Enable file watching and hot reload',
        short: 'w'
      }
    ),
    open: option(
      z.boolean().default(false),
      { 
        description: 'Open browser automatically',
        short: 'o'
      }
    )
  },
  handler: async ({ flags, spinner, colors, context }) => {
    const { port, host, watch, open } = flags
    
    const startSpinner = spinner('Starting development server...')
    
    // Simulate server startup
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    startSpinner.succeed(`Server started on ${colors.cyan(`http://${host}:${port}`)}`)
    
    if (watch) {
      console.log(colors.green('✓ File watching enabled'))
    }
    
    if (open) {
      console.log(colors.blue('→ Opening browser...'))
      // In a real implementation, you'd open the browser here
    }
    
    // Access plugin context
    if (hasMetricsStore(context?.store)) {
      context.store.metrics.recordEvent('server_started', { port, host })
    }
    
    console.log(colors.dim('\nPress Ctrl+C to stop the server'))
    
    // Simulate long-running server
    if (hasConfigStore(context?.store)) {
      console.log(colors.dim(`Config loaded: ${JSON.stringify(context.store.config, null, 2)}`))
    }
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log(colors.yellow('\nShutting down server...'))
      process.exit(0)
    })
    
    // Simulate server running
    await new Promise(() => {}) // Never resolves
  }
})

export default startCommand
