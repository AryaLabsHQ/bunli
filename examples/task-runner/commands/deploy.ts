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
    ),

    // Spinner variant
    spinner: option(
      z.enum(['braille', 'dots', 'line']).default('braille'),
      {
        description: 'Spinner style (braille, dots, line)'
      }
    )
  },
  
  handler: async ({ flags, colors, spinner, prompt }) => {
    type StepStatus = 'ok' | 'skip' | 'fail'
    type StepResult = {
      index: number
      description: string
      status: StepStatus
      durationMs: number
    }

    const steps = [
      { name: 'tests', description: 'Run test suite' },
      { name: 'build', description: 'Build application' },
      { name: 'cache', description: 'Warm up cache' },
      { name: 'migration', description: 'Run database migrations' },
      { name: 'deploy', description: 'Deploy to server' }
    ]
    
    const skippedSteps = flags.skip || []
    const totalSteps = steps.length
    const stepLabel = (index: number, description: string) => `[${index + 1}/${totalSteps}] ${description}`
    const results: StepResult[] = []
    let hasFailures = false
    let aborted = false

    const statusText = {
      ok: colors.green('PASS'),
      skip: colors.yellow('SKIP'),
      fail: colors.red('FAIL')
    }

    const renderPlan = () => {
      console.log(colors.cyan(`\n┌─ Deploy ${flags.environment}`))
      console.log(colors.dim('│'))
      for (const [index, step] of steps.entries()) {
        const isSkipped = skippedSteps.includes(step.name)
        const marker = isSkipped ? statusText.skip : colors.cyan('STEP')
        const dimmed = isSkipped ? colors.dim(' (skipped)') : ''
        console.log(`${colors.dim('│')} ${index + 1}. ${marker} ${step.description}${dimmed}`)
      }
      console.log(colors.cyan('└─ Ready'))
    }

    const renderSummary = () => {
      console.log(colors.cyan(`\n┌─ Deployment Summary (${flags.environment})`))
      for (const result of results) {
        const seconds = (result.durationMs / 1000).toFixed(1).padStart(4, ' ')
        const row = `${String(result.index + 1).padStart(2, '0')} ${statusText[result.status]} ${result.description}`
        console.log(`${colors.dim('│')} ${row} ${colors.dim(`${seconds}s`)}`)
      }
      console.log(colors.cyan('└─ Complete'))
    }

    renderPlan()
    
    // Confirmation prompt
    if (!flags.force) {
      const confirmed = await prompt.confirm(
        `\nDeploy to ${colors.cyan(flags.environment)}?`,
        { default: false, fallbackValue: false }
      )
      
      if (!confirmed) {
        prompt.cancel('Deployment cancelled')
        return
      }
    }
    
    // Execute deployment steps
    for (const [index, step] of steps.entries()) {
      if (skippedSteps.includes(step.name)) {
        results.push({
          index,
          description: step.description,
          status: 'skip',
          durationMs: 0
        })
        continue
      }
      
      const spin = spinner({
        text: `STEP ${stepLabel(index, step.description)}`,
        animation: flags.spinner,
        showTimer: true
      })
      const startedAt = Date.now()
      
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
        
        spin.succeed(stepLabel(index, step.description))
        results.push({
          index,
          description: step.description,
          status: 'ok',
          durationMs: Date.now() - startedAt
        })
        
      } catch (error) {
        spin.fail(`${stepLabel(index, step.description)} failed`)
        hasFailures = true
        results.push({
          index,
          description: step.description,
          status: 'fail',
          durationMs: Date.now() - startedAt
        })
        console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
        
        // Ask if user wants to continue
        if (step.name !== 'deploy') {
          const continueDeploy = await prompt.confirm(
            'Continue with remaining steps?',
            { default: false, fallbackValue: false }
          )
          
          if (!continueDeploy) {
            aborted = true
            break
          }
        } else {
          break
        }
      }
    }
    
    renderSummary()
    if (aborted) {
      prompt.cancel('Deployment aborted')
      throw new Error('Deployment aborted after step failure')
    }
    if (hasFailures) {
      prompt.log.error('Deployment finished with failures')
      throw new Error('Deployment failed')
    }

    prompt.outro(`Deployment completed (${flags.environment})`)
    
    const viewLogs = await prompt.confirm(
      'View deployment logs?',
      { default: false, fallbackValue: false }
    )
    
    if (viewLogs) {
      prompt.note(
        [
          '[2024-01-15 10:30:15] Starting deployment to staging',
          '[2024-01-15 10:30:16] Tests passed (45/45)',
          '[2024-01-15 10:30:45] Build completed (2.3s)',
          '[2024-01-15 10:30:46] Cache warmed up',
          '[2024-01-15 10:30:47] Migrations applied (0 pending)',
          '[2024-01-15 10:31:12] Deployment successful'
        ].join('\n'),
        'Recent deployment logs'
      )
    }
  }
})
