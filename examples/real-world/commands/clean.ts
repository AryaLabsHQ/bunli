import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'clean',
  description: 'Clean project artifacts and dependencies',
  options: {
    deps: option(
      z.coerce.boolean().default(true),
      { short: 'd', description: 'Clean node_modules' }
    ),
    
    cache: option(
      z.coerce.boolean().default(true),
      { short: 'c', description: 'Clean cache directories' }
    ),
    
    build: option(
      z.coerce.boolean().default(true),
      { short: 'b', description: 'Clean build artifacts' }
    ),
    
    logs: option(
      z.coerce.boolean().default(false),
      { short: 'l', description: 'Clean log files' }
    ),
    
    temp: option(
      z.coerce.boolean().default(true),
      { short: 't', description: 'Clean temporary files' }
    ),
    
    dry: option(
      z.coerce.boolean().default(false),
      { description: 'Dry run - show what would be deleted' }
    ),
    
    force: option(
      z.coerce.boolean().default(false),
      { short: 'f', description: 'Force deletion without confirmation' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt, spinner }) => {
    // Directories and patterns to clean
    const targets = []
    
    if (flags.deps) {
      targets.push(
        { path: 'node_modules', type: 'Dependencies' },
        { path: '.pnpm-store', type: 'PNPM cache' },
        { path: '.yarn', type: 'Yarn cache' }
      )
    }
    
    if (flags.cache) {
      targets.push(
        { path: '.cache', type: 'General cache' },
        { path: '.parcel-cache', type: 'Parcel cache' },
        { path: '.next', type: 'Next.js cache' },
        { path: '.nuxt', type: 'Nuxt cache' },
        { path: '.turbo', type: 'Turbo cache' },
        { path: '.eslintcache', type: 'ESLint cache' }
      )
    }
    
    if (flags.build) {
      targets.push(
        { path: 'dist', type: 'Build output' },
        { path: 'build', type: 'Build directory' },
        { path: 'out', type: 'Output directory' },
        { path: '.output', type: 'Nuxt output' },
        { path: 'coverage', type: 'Coverage reports' }
      )
    }
    
    if (flags.logs) {
      targets.push(
        { path: '*.log', type: 'Log files', pattern: true },
        { path: 'logs', type: 'Logs directory' },
        { path: '.npm/_logs', type: 'NPM logs' }
      )
    }
    
    if (flags.temp) {
      targets.push(
        { path: '*.tmp', type: 'Temp files', pattern: true },
        { path: '.tmp', type: 'Temp directory' },
        { path: '.temp', type: 'Temp directory' },
        { path: '*.swp', type: 'Swap files', pattern: true },
        { path: '.DS_Store', type: 'macOS files', pattern: true }
      )
    }
    
    if (targets.length === 0) {
      console.log(colors.yellow('No cleanup targets selected'))
      return
    }
    
    // Check what exists
    console.log(colors.bold('Scanning for files to clean...\n'))
    
    const toDelete = []
    let totalSize = 0
    
    for (const target of targets) {
      try {
        if (target.pattern) {
          // Use find for patterns
          const files = await shell`find . -name "${target.path}" -maxdepth 3 2>/dev/null`.text()
          if (files.trim()) {
            const fileList = files.trim().split('\n')
            for (const file of fileList) {
              const size = await shell`du -sh "${file}" 2>/dev/null | cut -f1`.text()
              toDelete.push({ ...target, path: file, size: size.trim() })
            }
          }
        } else {
          // Check if directory/file exists
          await shell`test -e ${target.path}`.quiet()
          const size = await shell`du -sh ${target.path} 2>/dev/null | cut -f1`.text()
          toDelete.push({ ...target, size: size.trim() })
        }
      } catch {
        // Path doesn't exist, skip
      }
    }
    
    if (toDelete.length === 0) {
      console.log(colors.green('✓ Nothing to clean - project is already clean!'))
      return
    }
    
    // Show what will be deleted
    console.log(colors.bold('Will delete:\n'))
    toDelete.forEach(item => {
      console.log(`${colors.red('×')} ${item.path.padEnd(30)} ${colors.dim(`(${item.type}, ${item.size})`)}`)
    })
    
    console.log(colors.dim('\n' + '━'.repeat(60)))
    console.log(`Total items: ${colors.yellow(toDelete.length.toString())}`)
    
    if (flags.dry) {
      console.log(colors.cyan('\nDry run - no files were deleted'))
      return
    }
    
    // Confirm deletion
    if (!flags.force) {
      const confirm = await prompt.confirm('\nProceed with deletion?', { default: false })
      if (!confirm) {
        console.log(colors.red('Cancelled'))
        return
      }
    }
    
    console.log()
    
    // Delete files
    let deleted = 0
    let failed = 0
    
    for (const item of toDelete) {
      const spin = spinner(`Deleting ${item.path}...`)
      spin.start()
      
      try {
        await shell`rm -rf ${item.path}`
        spin.succeed(`Deleted ${item.path}`)
        deleted++
      } catch (error) {
        spin.fail(`Failed to delete ${item.path}`)
        console.error(colors.red(`  ${error}`))
        failed++
      }
    }
    
    // Summary
    console.log(colors.dim('\n' + '━'.repeat(60)))
    
    if (failed === 0) {
      console.log(colors.green(`✓ Successfully cleaned ${deleted} items`))
    } else {
      console.log(colors.yellow(`Cleaned ${deleted} items, ${failed} failed`))
    }
    
    // Suggest next steps
    if (flags.deps && deleted > 0) {
      console.log(colors.dim('\nRun `bun install` to restore dependencies'))
    }
  }
})