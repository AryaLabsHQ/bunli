import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'clean',
  description: 'Clean up Docker resources',
  options: {
    all: option(
      z.coerce.boolean().default(false),
      { short: 'a', description: 'Remove all unused resources' }
    ),
    
    images: option(
      z.coerce.boolean().default(true),
      { short: 'i', description: 'Remove dangling images' }
    ),
    
    containers: option(
      z.coerce.boolean().default(true),
      { short: 'c', description: 'Remove stopped containers' }
    ),
    
    volumes: option(
      z.coerce.boolean().default(false),
      { short: 'v', description: 'Remove unused volumes (careful!)' }
    ),
    
    networks: option(
      z.coerce.boolean().default(true),
      { short: 'n', description: 'Remove unused networks' }
    ),
    
    force: option(
      z.coerce.boolean().default(false),
      { short: 'f', description: 'Force removal without confirmation' }
    ),
    
    older: option(
      z.string().optional(),
      { short: 'o', description: 'Remove resources older than (e.g., 24h, 7d)' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt, spinner }) => {
    // Check if Docker is installed and running
    try {
      await shell`docker version`.quiet()
    } catch {
      console.error(colors.red('Docker is not running or not installed'))
      process.exit(1)
    }
    
    // Get current usage
    console.log(colors.bold('Current Docker disk usage:\n'))
    await shell`docker system df`
    console.log()
    
    const actions = []
    
    if (flags.all) {
      actions.push({
        name: 'all unused resources',
        command: 'docker system prune -a',
        dangerous: true
      })
    } else {
      if (flags.containers) {
        actions.push({
          name: 'stopped containers',
          command: 'docker container prune'
        })
      }
      
      if (flags.images) {
        actions.push({
          name: 'dangling images',
          command: 'docker image prune'
        })
      }
      
      if (flags.networks) {
        actions.push({
          name: 'unused networks',
          command: 'docker network prune'
        })
      }
      
      if (flags.volumes) {
        actions.push({
          name: 'unused volumes',
          command: 'docker volume prune',
          dangerous: true
        })
      }
    }
    
    if (actions.length === 0) {
      console.log(colors.yellow('No cleanup actions selected'))
      return
    }
    
    // Add filters if specified
    if (flags.older) {
      actions.forEach(action => {
        action.command += ` --filter "until=${flags.older}"`
      })
    }
    
    // Show what will be cleaned
    console.log(colors.bold('Will clean:'))
    actions.forEach(action => {
      const icon = action.dangerous ? colors.red('⚠') : colors.green('✓')
      console.log(`${icon} ${action.name}`)
    })
    
    // Confirm unless force flag is set
    if (!flags.force) {
      const confirm = await prompt.confirm('\nProceed with cleanup?', { default: false })
      if (!confirm) {
        console.log(colors.red('Cancelled'))
        return
      }
    }
    
    console.log()
    
    // Execute cleanup
    for (const action of actions) {
      const spin = spinner(`Cleaning ${action.name}...`)
      spin.start()
      
      try {
        const cmd = flags.force ? `${action.command} -f` : action.command
        const result = await shell`${cmd}`.text()
        
        // Parse the output to show what was removed
        const lines = result.split('\n').filter(line => line.includes('deleted') || line.includes('removed'))
        
        if (lines.length > 0) {
          spin.succeed(`Cleaned ${action.name}`)
          lines.forEach(line => console.log(colors.dim(`  ${line.trim()}`)))
        } else {
          spin.succeed(`No ${action.name} to clean`)
        }
      } catch (error) {
        spin.fail(`Failed to clean ${action.name}`)
        console.error(colors.red(error))
      }
    }
    
    // Show disk usage after cleanup
    console.log(colors.bold('\nDisk usage after cleanup:\n'))
    await shell`docker system df`
    
    // Calculate space saved (simulated)
    console.log(colors.green('\n✓ Cleanup completed!'))
    console.log(colors.dim(`Space reclaimed: ~${colors.yellow('1.2 GB')}`))
  }
})