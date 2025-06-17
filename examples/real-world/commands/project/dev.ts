import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'dev',
  description: 'Start development server',
  alias: 'd',
  options: {
    port: option(
      z.coerce.number()
        .int()
        .min(1000)
        .max(65535)
        .default(3000),
      { short: 'p', description: 'Port to run on' }
    ),
    
    host: option(
      z.string().default('localhost'),
      { short: 'h', description: 'Host to bind to' }
    ),
    
    open: option(
      z.coerce.boolean().default(true),
      { short: 'o', description: 'Open browser automatically' }
    ),
    
    https: option(
      z.coerce.boolean().default(false),
      { description: 'Use HTTPS' }
    )
  },
  
  handler: async ({ flags, shell, colors, spinner }) => {
    // Check if package.json exists
    try {
      await shell`test -f package.json`.quiet()
    } catch {
      console.error(colors.red('No package.json found in current directory'))
      process.exit(1)
    }
    
    const protocol = flags.https ? 'https' : 'http'
    const url = `${protocol}://${flags.host}:${flags.port}`
    
    console.log(colors.bold('Starting development server...'))
    console.log(colors.dim('━'.repeat(40)))
    console.log(`URL: ${colors.cyan(url)}`)
    console.log(`Host: ${colors.yellow(flags.host)}`)
    console.log(`Port: ${colors.green(flags.port.toString())}`)
    console.log(colors.dim('━'.repeat(40)))
    
    if (flags.open) {
      // Wait a bit for server to start
      setTimeout(async () => {
        console.log(colors.dim('Opening browser...'))
        await shell`open ${url}`.quiet()
      }, 2000)
    }
    
    // Run dev server (this would normally be a long-running process)
    console.log(colors.gray('\nPress Ctrl+C to stop the server'))
    
    // Simulate server running
    await new Promise(() => {
      // Keep running until interrupted
    })
  }
})