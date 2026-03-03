import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { hasConfigStore, hasMetricsStore } from './store-guards.js'

const buildCommand = defineCommand({
  name: 'build',
  description: 'Build for production',
  options: {
    output: option(
      z.string().default('dist'),
      { 
        description: 'Output directory',
        short: 'o'
      }
    ),
    minify: option(
      z.boolean().default(true),
      { 
        description: 'Minify output',
        short: 'm'
      }
    ),
    sourcemap: option(
      z.boolean().default(false),
      { 
        description: 'Generate source maps',
        short: 's'
      }
    ),
    target: option(
      z.enum(['node', 'bun', 'browser']).default('node'),
      { 
        description: 'Build target',
        short: 't'
      }
    )
  },
  handler: async ({ flags, spinner, colors, context }) => {
    const { output, minify, sourcemap, target } = flags
    
    const buildSpinner = spinner('Building for production...')
    
    // Simulate build process
    const steps = [
      'Compiling TypeScript...',
      'Bundling modules...',
      'Optimizing assets...',
      'Generating source maps...',
      'Writing output...'
    ]
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      buildSpinner.update(steps[i]!)
    }
    
    buildSpinner.succeed(`Build completed successfully`)
    
    console.log(colors.green(`✓ Output: ${output}`))
    console.log(colors.green(`✓ Target: ${target}`))
    console.log(colors.green(`✓ Minified: ${minify ? 'Yes' : 'No'}`))
    console.log(colors.green(`✓ Source maps: ${sourcemap ? 'Yes' : 'No'}`))
    
    // Access plugin context - now properly typed!
    if (hasMetricsStore(context?.store)) {
      context.store.metrics.recordEvent('build_completed', { 
        output, 
        minify, 
        sourcemap, 
        target 
      })
    }

    if (hasConfigStore(context?.store)) {
      console.log(colors.dim(`Build config: ${JSON.stringify(context.store.config, null, 2)}`))
    }
  }
})

export default buildCommand
