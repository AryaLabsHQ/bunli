import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'stats',
  description: 'Show Docker resource usage statistics',
  options: {
    format: option(
      z.enum(['table', 'json', 'simple']).default('table'),
      { short: 'f', description: 'Output format' }
    ),
    
    all: option(
      z.coerce.boolean().default(false),
      { short: 'a', description: 'Show all containers (including stopped)' }
    ),
    
    limit: option(
      z.coerce.number().int().positive().default(10),
      { short: 'l', description: 'Number of containers to show' }
    ),
    
    sort: option(
      z.enum(['cpu', 'memory', 'name', 'status']).default('cpu'),
      { short: 's', description: 'Sort by field' }
    ),
    
    watch: option(
      z.coerce.boolean().default(false),
      { short: 'w', description: 'Watch mode (refresh every 2s)' }
    )
  },
  
  handler: async ({ flags, shell, colors }) => {
    // Check if Docker is running
    try {
      await shell`docker version`.quiet()
    } catch {
      console.error(colors.red('Docker is not running or not installed'))
      process.exit(1)
    }
    
    const showStats = async () => {
      // Clear screen in watch mode
      if (flags.watch) {
        console.clear()
      }
      
      // Header
      console.log(colors.bold('Docker Resource Usage'))
      console.log(colors.dim('━'.repeat(80)))
      
      // System overview
      const info = await shell`docker system df --format json`.json()
      
      console.log(colors.cyan('\nSystem Overview:'))
      console.log(`Images: ${colors.yellow(info.Images?.length || 0)} (${colors.dim(info.Images?.Size || '0 B')})`)
      console.log(`Containers: ${colors.yellow(info.Containers?.length || 0)} (${colors.dim(info.Containers?.Size || '0 B')})`)
      console.log(`Volumes: ${colors.yellow(info.Volumes?.length || 0)} (${colors.dim(info.Volumes?.Size || '0 B')})`)
      
      // Container stats (simulated for demo)
      const containers = [
        { name: 'web-app', cpu: '45.2%', memory: '512 MB / 2 GB', status: 'running' },
        { name: 'postgres-db', cpu: '12.8%', memory: '1.2 GB / 4 GB', status: 'running' },
        { name: 'redis-cache', cpu: '2.1%', memory: '128 MB / 512 MB', status: 'running' },
        { name: 'nginx-proxy', cpu: '0.8%', memory: '64 MB / 256 MB', status: 'running' },
        { name: 'worker-1', cpu: '78.5%', memory: '768 MB / 1 GB', status: 'running' },
        { name: 'test-runner', cpu: '0.0%', memory: '0 B / 512 MB', status: 'stopped' }
      ]
      
      // Filter based on flags
      let displayContainers = flags.all 
        ? containers 
        : containers.filter(c => c.status === 'running')
      
      // Sort containers
      displayContainers.sort((a, b) => {
        switch (flags.sort) {
          case 'cpu':
            return parseFloat(b.cpu) - parseFloat(a.cpu)
          case 'memory':
            return parseInt(b.memory) - parseInt(a.memory)
          case 'name':
            return a.name.localeCompare(b.name)
          case 'status':
            return a.status.localeCompare(b.status)
          default:
            return 0
        }
      })
      
      // Limit results
      displayContainers = displayContainers.slice(0, flags.limit)
      
      console.log(colors.cyan('\n\nContainer Stats:'))
      console.log(colors.dim('━'.repeat(80)))
      
      if (flags.format === 'table') {
        // Table header
        console.log(
          colors.bold('CONTAINER').padEnd(20),
          colors.bold('CPU').padEnd(15),
          colors.bold('MEMORY').padEnd(25),
          colors.bold('STATUS').padEnd(15)
        )
        console.log(colors.dim('─'.repeat(80)))
        
        // Table rows
        displayContainers.forEach(container => {
          const cpuColor = parseFloat(container.cpu) > 70 ? colors.red : 
                           parseFloat(container.cpu) > 40 ? colors.yellow : 
                           colors.green
          
          const statusColor = container.status === 'running' ? colors.green : colors.gray
          
          console.log(
            container.name.padEnd(20),
            cpuColor(container.cpu.padEnd(15)),
            colors.blue(container.memory.padEnd(25)),
            statusColor(container.status.padEnd(15))
          )
        })
      } else if (flags.format === 'json') {
        console.log(JSON.stringify(displayContainers, null, 2))
      } else {
        // Simple format
        displayContainers.forEach(container => {
          console.log(`${colors.bold(container.name)}: CPU ${container.cpu}, Memory ${container.memory}`)
        })
      }
      
      // Summary
      const totalCpu = displayContainers
        .filter(c => c.status === 'running')
        .reduce((sum, c) => sum + parseFloat(c.cpu), 0)
      
      console.log(colors.dim('\n' + '━'.repeat(80)))
      console.log(`Total CPU usage: ${colors.yellow(totalCpu.toFixed(1) + '%')}`)
      
      if (flags.watch) {
        console.log(colors.gray('\nRefreshing every 2 seconds... Press Ctrl+C to stop'))
      }
    }
    
    // Initial display
    await showStats()
    
    // Watch mode
    if (flags.watch) {
      setInterval(showStats, 2000)
      
      // Keep process running
      await new Promise(() => {})
    }
  }
})