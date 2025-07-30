import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export const configureCommand = defineCommand({
  name: 'configure',
  description: 'Configure application settings interactively',
  options: {
    apiUrl: option(
      z.string().url().describe('API endpoint URL'),
      { description: 'API base URL' }
    ),
    apiKey: option(
      z.string().min(10).describe('Your API key'),
      { description: 'API authentication key' }
    ),
    region: option(
      z.enum(['us-east', 'us-west', 'eu-west', 'ap-south']).default('us-east'),
      { description: 'Deployment region' }
    ),
    maxConnections: option(
      z.number().min(1).max(100).default(10),
      { description: 'Maximum concurrent connections' }
    ),
    timeout: option(
      z.number().min(1000).max(60000).default(5000),
      { description: 'Request timeout in milliseconds' }
    ),
    retries: option(
      z.number().min(0).max(10).default(3),
      { description: 'Number of retry attempts' }
    ),
    debug: option(
      z.boolean().default(false),
      { description: 'Enable debug mode' }
    ),
    features: option(
      z.array(z.enum(['analytics', 'monitoring', 'logging', 'caching'])).default([]),
      { description: 'Enable features' }
    )
  },
  handler: async ({ flags, runtime }) => {
    const { colors } = await import('@bunli/utils')
    
    console.log(colors.blue('Configuration saved successfully!'))
    console.log()
    console.log('Current configuration:')
    console.log(`  ${colors.dim('API URL:')} ${flags.apiUrl}`)
    console.log(`  ${colors.dim('API Key:')} ${flags.apiKey.slice(0, 4)}****`)
    console.log(`  ${colors.dim('Region:')} ${flags.region}`)
    console.log(`  ${colors.dim('Max Connections:')} ${flags.maxConnections}`)
    console.log(`  ${colors.dim('Timeout:')} ${flags.timeout}ms`)
    console.log(`  ${colors.dim('Retries:')} ${flags.retries}`)
    console.log(`  ${colors.dim('Debug Mode:')} ${flags.debug ? 'Enabled' : 'Disabled'}`)
    
    if (flags.features.length > 0) {
      console.log(`  ${colors.dim('Features:')} ${flags.features.join(', ')}`)
    }
    
    console.log()
    console.log(colors.dim(`Configuration completed in ${Date.now() - runtime.startTime}ms`))
  }
})