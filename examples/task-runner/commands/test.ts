import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'test' as const,
  description: 'Run tests with complex validation patterns',
  options: {
    // Test pattern with regex validation
    pattern: option(
      z.string()
        .min(1, 'Pattern cannot be empty')
        .default('**/*.test.ts'),
      { 
        short: 'p', 
        description: 'Test file pattern' 
      }
    ),
    
    // Coverage threshold with range validation
    coverage: option(
      z.coerce.number()
        .min(0, 'Coverage must be at least 0%')
        .max(100, 'Coverage cannot exceed 100%')
        .default(80),
      { 
        short: 'c', 
        description: 'Minimum coverage percentage' 
      }
    ),
    
    // Timeout with custom validation
    timeout: option(
      z.coerce.number()
        .int('Timeout must be a whole number')
        .min(1000, 'Timeout must be at least 1000ms')
        .max(300000, 'Timeout cannot exceed 5 minutes')
        .default(30000),
      { 
        short: 't', 
        description: 'Test timeout in milliseconds' 
      }
    ),
    
    // Environment variables with validation
    env: option(
      z.string()
        .refine((val) => {
          const vars = val.split(',')
          return vars.every(v => v.includes('=') && v.split('=').length === 2)
        }, 'Environment variables must be in format KEY=VALUE,KEY2=VALUE2')
        .transform((val) => {
          const vars: Record<string, string> = {}
          val.split(',').forEach(pair => {
            const [key, value] = pair.split('=')
            if (key && value) {
              vars[key.trim()] = value.trim()
            }
          })
          return vars
        })
        .optional(),
      { 
        short: 'e', 
        description: 'Environment variables (KEY=VALUE,KEY2=VALUE2)' 
      }
    ),
    
    // Retry count with custom validation
    retries: option(
      z.coerce.number()
        .int('Retries must be a whole number')
        .min(0, 'Retries cannot be negative')
        .max(5, 'Maximum 5 retries allowed')
        .default(0),
      { 
        short: 'r', 
        description: 'Number of retries for failed tests' 
      }
    ),
    
    // Watch mode
    watch: option(
      z.coerce.boolean().default(false),
      { 
        short: 'w', 
        description: 'Watch for changes' 
      }
    ),
    
    // Verbose output
    verbose: option(
      z.coerce.boolean().default(false),
      { 
        short: 'v', 
        description: 'Verbose output' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner }) => {
    const spin = spinner('Running tests...')
    let completionFailed = false
    
    try {
      // Simulate test discovery
      spin.update('Discovering test files...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const testFiles = [
        'src/utils.test.ts',
        'src/api.test.ts',
        'src/components.test.ts'
      ]
      
      spin.update(`Found ${testFiles.length} test files`)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Simulate test execution
      let passed = 0
      let failed = 0
      
      for (const file of testFiles) {
        spin.update(`Running ${file}...`)
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Simulate some tests failing
        if (file.includes('api')) {
          failed++
          if (flags.verbose) {
            console.log(colors.red(`  FAIL ${file}: API endpoint test failed`))
          }
        } else {
          passed++
          if (flags.verbose) {
            console.log(colors.green(`  OK   ${file}: All tests passed`))
          }
        }
      }
      
      // Simulate coverage calculation
      spin.update('Calculating coverage...')
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const coverage = 85.5 // Simulated coverage
      
      const hasFailedTests = failed > 0
      const hasCoverageGap = coverage < flags.coverage
      if (hasFailedTests || hasCoverageGap) {
        const reason = hasCoverageGap
          ? `coverage ${coverage}% is below threshold ${flags.coverage}%`
          : `${failed} test file(s) failed`
        spin.fail(`Tests completed with failures: ${reason}`)
        completionFailed = true
      } else {
        spin.succeed(`Tests completed! ${passed} passed, ${failed} failed`)
      }
      
      console.log(colors.bold('\nTest Results:'))
      console.log(`  Pattern: ${colors.cyan(flags.pattern)}`)
      console.log(`  Passed: ${colors.green(String(passed))}`)
      console.log(`  Failed: ${colors.red(String(failed))}`)
      console.log(`  Coverage: ${colors.cyan(coverage.toFixed(1))}%`)
      console.log(`  Timeout: ${colors.cyan(String(flags.timeout))}ms`)
      
      if (flags.env) {
        console.log(`  Environment: ${colors.cyan(String(Object.keys(flags.env).length))} variables`)
      }
      
      if (flags.retries > 0) {
        console.log(`  Retries: ${colors.cyan(String(flags.retries))}`)
      }
      
      if (flags.watch) {
        console.log(colors.yellow('\nWatching for changes...'))
      }

      if (hasFailedTests || hasCoverageGap) {
        const message = hasCoverageGap
          ? `Coverage ${coverage}% is below required ${flags.coverage}%`
          : `${failed} test file(s) failed`
        throw new Error(message)
      }
      
    } catch (error) {
      if (!completionFailed) {
        spin.fail('Tests failed')
      }
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      throw error
    }
  }
})
