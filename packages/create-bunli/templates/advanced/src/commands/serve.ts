import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '../utils/config.js'

export const serveCommand = defineCommand({
  name: 'serve',
  description: 'Start a development server',
  options: {
    port: option(
      z.number().int().min(1).max(65535).default(3000),
      {
        short: 'p',
        description: 'Port to listen on'
      }
    ),
    host: option(
      z.string().default('localhost'),
      {
        short: 'h',
        description: 'Host to bind to'
      }
    ),
    open: option(
      z.boolean().default(true),
      {
        description: 'Open browser on start'
      }
    )
  },
  handler: async ({ flags, colors, spinner, shell }) => {
    const spin = spinner('Starting server...')
    spin.start()
    
    try {
      // Load config
      const config = await loadConfig()
      
      // Merge flags with config
      const port = flags.port || config.server?.port || 3000
      const host = flags.host || config.server?.host || 'localhost'
      const shouldOpen = flags.open ?? config.server?.open ?? true
      
      // Create server
      const server = Bun.serve({
        port,
        hostname: host,
        fetch(req) {
          const url = new URL(req.url)
          
          // Simple router
          if (url.pathname === '/') {
            return new Response(getHomePage(), {
              headers: { 'Content-Type': 'text/html' }
            })
          }
          
          if (url.pathname === '/api/status') {
            return Response.json({
              status: 'ok',
              version: '0.1.0',
              uptime: process.uptime()
            })
          }
          
          return new Response('Not Found', { status: 404 })
        }
      })
      
      spin.succeed(`Server running at http://${host}:${port}`)
      
      // Open browser
      if (shouldOpen) {
        const openSpin = spinner('Opening browser...')
        openSpin.start()
        
        try {
          const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`
          
          // Platform-specific open commands
          const openCommand = process.platform === 'darwin' ? 'open' :
                            process.platform === 'win32' ? 'start' :
                            'xdg-open'
          
          await shell`${openCommand} ${url}`.quiet()
          openSpin.succeed('Browser opened')
        } catch {
          openSpin.fail('Failed to open browser')
        }
      }
      
      // Keep server running
      console.log()
      console.log(colors.dim('Press Ctrl+C to stop the server'))
      
      // Handle shutdown
      process.on('SIGINT', () => {
        console.log()
        console.log(colors.yellow('Shutting down server...'))
        server.stop()
        process.exit(0)
      })
      
    } catch (error) {
      spin.fail('Failed to start server')
      console.error(colors.red(String(error)))
      process.exit(1)
    }
  }
})

function getHomePage(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>{{name}}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #10b981;
      color: white;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    code {
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      font-family: monospace;
    }
    .endpoints {
      margin-top: 2rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>{{name}}</h1>
    <p>{{description}}</p>
    <p><span class="status">Running</span></p>
    
    <div class="endpoints">
      <h3>API Endpoints</h3>
      <ul>
        <li><code>GET /</code> - This page</li>
        <li><code>GET /api/status</code> - Server status</li>
      </ul>
    </div>
    
    <p>To get started, check out the <a href="https://github.com/AryaLabsHQ/bunli">documentation</a>.</p>
  </div>
</body>
</html>
  `.trim()
}