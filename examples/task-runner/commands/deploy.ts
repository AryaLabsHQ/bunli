import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy' as const,
  description: 'Deploy application with interactive prompts',
  options: {
    // Environment with validation
    environment: option(
      z.enum(['development', 'staging', 'production'])
        .default('staging'),
      { 
        short: 'e', 
        description: 'Target environment' 
      }
    ),
    
    // Skip steps with validation
    skip: option(
      z.string()
        .transform((val) => val.split(',').map(s => s.trim()))
        .refine((steps) => {
          const validSteps = ['tests', 'build', 'cache', 'migration']
          return steps.every(step => validSteps.includes(step))
        }, 'Invalid step. Valid steps: tests, build, cache, migration')
        .optional(),
      { 
        short: 's', 
        description: 'Skip steps (tests,build,cache,migration)' 
      }
    ),
    
    // Force deployment
    force: option(
      z.coerce.boolean().default(false),
      { 
        short: 'f', 
        description: 'Force deployment without confirmation' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner, prompt }) => {
    const steps = [
      { name: 'tests', description: 'Run test suite' },
      { name: 'build', description: 'Build application' },
      { name: 'cache', description: 'Warm up cache' },
      { name: 'migration', description: 'Run database migrations' },
      { name: 'deploy', description: 'Deploy to server' }
    ]
    
    const skippedSteps = flags.skip || []
    
    // Show deployment plan
    console.log(colors.bold(`\n🚀 Deployment Plan (${flags.environment}):`))
    steps.forEach((step, index) => {
      const isSkipped = skippedSteps.includes(step.name)
      const icon = isSkipped ? colors.yellow('⏭️') : colors.cyan('📋')
      const status = isSkipped ? colors.dim('(skipped)') : ''
      console.log(`  ${index + 1}. ${icon} ${step.description} ${status}`)
    })
    
    // Confirmation prompt
    if (!flags.force) {
      const confirmed = await prompt.confirm(
        `\nDeploy to ${colors.cyan(flags.environment)}?`,
        { default: false }
      )
      
      if (!confirmed) {
        console.log(colors.yellow('Deployment cancelled'))
        return
      }
    }
    
    // Execute deployment steps
    for (const [index, step] of steps.entries()) {
      if (skippedSteps.includes(step.name)) {
        console.log(colors.yellow(`⏭️  Skipping: ${step.description}`))
        continue
      }
      
      const spin = spinner(`Step ${index + 1}/${steps.length}: ${step.description}`)
      
      try {
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Simulate substeps for some operations
        if (step.name === 'build') {
          spin.update('Installing dependencies...')
          await new Promise(resolve => setTimeout(resolve, 500))
          
          spin.update('Compiling TypeScript...')
          await new Promise(resolve => setTimeout(resolve, 800))
          
          spin.update('Bundling assets...')
          await new Promise(resolve => setTimeout(resolve, 600))
        } else if (step.name === 'deploy') {
          spin.update('Uploading files...')
          await new Promise(resolve => setTimeout(resolve, 700))
          
          spin.update('Restarting services...')
          await new Promise(resolve => setTimeout(resolve, 500))
          
          spin.update('Health check...')
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        spin.succeed(`✅ ${step.description}`)
        
      } catch (error) {
        spin.fail(`❌ ${step.description} failed`)
        console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
        
        // Ask if user wants to continue
        if (step.name !== 'deploy') {
          const continueDeploy = await prompt.confirm(
            'Continue with remaining steps?',
            { default: false }
          )
          
          if (!continueDeploy) {
            console.log(colors.yellow('Deployment aborted'))
            return
          }
        } else {
          console.log(colors.red('Deployment failed'))
          return
        }
      }
    }
    
    // Show post-deployment options
    console.log(colors.green('\n🎉 Deployment completed successfully!'))
    
    const viewLogs = await prompt.confirm(
      'View deployment logs?',
      { default: false }
    )
    
    if (viewLogs) {
      console.log(colors.dim('\n📋 Recent deployment logs:'))
      console.log(colors.dim('  [2024-01-15 10:30:15] Starting deployment to staging'))
      console.log(colors.dim('  [2024-01-15 10:30:16] Tests passed (45/45)'))
      console.log(colors.dim('  [2024-01-15 10:30:45] Build completed (2.3s)'))
      console.log(colors.dim('  [2024-01-15 10:30:46] Cache warmed up'))
      console.log(colors.dim('  [2024-01-15 10:30:47] Migrations applied (0 pending)'))
      console.log(colors.dim('  [2024-01-15 10:31:12] Deployment successful'))
    }
  }
})
