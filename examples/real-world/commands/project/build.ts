import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'build' as const,
  description: 'Build project for production',
  alias: 'b',
  options: {
    mode: option(
      z.enum(['production', 'development']).default('production'),
      { short: 'm', description: 'Build mode' }
    ),
    
    sourcemap: option(
      z.coerce.boolean().default(false),
      { short: 's', description: 'Generate source maps' }
    ),
    
    minify: option(
      z.coerce.boolean().default(true),
      { description: 'Minify output' }
    ),
    
    analyze: option(
      z.coerce.boolean().default(false),
      { short: 'a', description: 'Analyze bundle size' }
    ),
    
    clean: option(
      z.coerce.boolean().default(true),
      { short: 'c', description: 'Clean output directory before build' }
    ),
    
    watch: option(
      z.coerce.boolean().default(false),
      { short: 'w', description: 'Watch for changes' }
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
    
    const spin = spinner('Building project...')
    spin.start()
    
    if (flags.clean) {
      spin.update('Cleaning output directory...')
      await shell`rm -rf dist`.quiet()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    spin.update(`Building in ${flags.mode} mode...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (flags.minify) {
      spin.update('Minifying output...')
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    if (flags.sourcemap) {
      spin.update('Generating source maps...')
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    if (flags.analyze) {
      spin.update('Analyzing bundle size...')
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
    
    spin.succeed('Build completed successfully!')
    
    // Show build summary
    console.log(colors.dim('\n━'.repeat(40)))
    console.log(colors.bold('Build Summary:'))
    console.log(`Mode: ${colors.cyan(flags.mode)}`)
    console.log(`Output: ${colors.green('./dist')}`)
    console.log(`Size: ${colors.yellow('1.2 MB')} (gzipped: ${colors.green('384 KB')})`)
    console.log(colors.dim('━'.repeat(40)))
    
    if (flags.analyze) {
      console.log('\nBundle Analysis:')
      console.log(`  ${colors.gray('main.js')}     ${colors.yellow('892 KB')}`)
      console.log(`  ${colors.gray('vendor.js')}   ${colors.yellow('312 KB')}`)
      console.log(`  ${colors.gray('styles.css')}  ${colors.yellow('48 KB')}`)
    }
    
    if (flags.watch) {
      console.log(colors.gray('\nWatching for changes... Press Ctrl+C to stop'))
      await new Promise(() => {
        // Keep watching until interrupted
      })
    }
  }
})