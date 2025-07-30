import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export const deployCommand = defineCommand({
  name: 'deploy',
  description: 'Deploy your application with interactive configuration',
  options: {
    environment: option(
      z.enum(['development', 'staging', 'production']).describe('Deployment environment'),
      { description: 'Target environment', short: 'e' }
    ),
    branch: option(
      z.string().default('main'),
      { description: 'Git branch to deploy', short: 'b' }
    ),
    skipTests: option(
      z.boolean().default(false),
      { description: 'Skip running tests', short: 'S' }
    ),
    skipBuild: option(
      z.boolean().default(false),
      { description: 'Skip build step' }
    ),
    dryRun: option(
      z.boolean().default(false),
      { description: 'Perform a dry run', short: 'd' }
    ),
    instances: option(
      z.number().min(1).max(20).default(2),
      { description: 'Number of instances' }
    ),
    memory: option(
      z.enum(['256MB', '512MB', '1GB', '2GB', '4GB']).default('512MB'),
      { description: 'Memory per instance' }
    ),
    autoscale: option(
      z.boolean().default(true),
      { description: 'Enable auto-scaling' }
    ),
    notify: option(
      z.array(z.string().email()).optional(),
      { description: 'Email addresses to notify' }
    )
  },
  handler: async ({ flags, positional }) => {
    const { colors, spinner } = await import('@bunli/utils')
    
    const appName = positional[0] || 'my-app'
    
    console.log(colors.bold(`Deploying ${appName} to ${flags.environment}...`))
    console.log()
    
    if (flags.dryRun) {
      console.log(colors.yellow('🔸 Running in dry-run mode'))
    }
    
    // Validation phase
    const validateSpinner = spinner('Validating deployment configuration...')
    await new Promise(resolve => setTimeout(resolve, 800))
    validateSpinner.success('Configuration validated')
    
    // Tests phase
    if (!flags.skipTests) {
      const testSpinner = spinner('Running tests...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      testSpinner.success('All tests passed')
    }
    
    // Build phase
    if (!flags.skipBuild) {
      const buildSpinner = spinner('Building application...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      buildSpinner.success('Build completed')
    }
    
    // Deploy phase
    const deploySpinner = spinner(`Deploying to ${flags.environment}...`)
    await new Promise(resolve => setTimeout(resolve, 2500))
    deploySpinner.success('Deployment successful')
    
    console.log()
    console.log(colors.green('✓ Deployment completed successfully!'))
    console.log()
    console.log('Deployment details:')
    console.log(`  ${colors.dim('Application:')} ${appName}`)
    console.log(`  ${colors.dim('Environment:')} ${flags.environment}`)
    console.log(`  ${colors.dim('Branch:')} ${flags.branch}`)
    console.log(`  ${colors.dim('Instances:')} ${flags.instances}`)
    console.log(`  ${colors.dim('Memory:')} ${flags.memory} per instance`)
    console.log(`  ${colors.dim('Auto-scaling:')} ${flags.autoscale ? 'Enabled' : 'Disabled'}`)
    
    if (flags.notify && flags.notify.length > 0) {
      console.log()
      console.log(colors.dim(`Notifications sent to: ${flags.notify.join(', ')}`))
    }
    
    console.log()
    console.log(colors.cyan(`🔗 View deployment: https://${appName}-${flags.environment}.example.com`))
  }
})