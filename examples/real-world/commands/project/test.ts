import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'test',
  description: 'Run tests',
  alias: 't',
  options: {
    watch: option(
      z.coerce.boolean().default(false),
      { short: 'w', description: 'Watch mode' }
    ),
    
    coverage: option(
      z.coerce.boolean().default(false),
      { short: 'c', description: 'Generate coverage report' }
    ),
    
    bail: option(
      z.coerce.boolean().default(false),
      { short: 'b', description: 'Stop on first test failure' }
    ),
    
    filter: option(
      z.string().optional(),
      { short: 'f', description: 'Filter test files by pattern' }
    ),
    
    verbose: option(
      z.coerce.boolean().default(false),
      { short: 'v', description: 'Verbose output' }
    ),
    
    ui: option(
      z.coerce.boolean().default(true),
      { short: 'u', description: 'Show interactive UI' }
    )
  },
  
  handler: async ({ flags, shell, colors, spinner }) => {
    // Check if test files exist
    try {
      await shell`test -d test || test -d tests || test -d __tests__ || test -f *.test.* || test -f *.spec.*`.quiet()
    } catch {
      console.error(colors.red('No test files found'))
      process.exit(1)
    }
    
    console.log(colors.bold('Running tests...\n'))
    
    // Simulate test run
    const tests = [
      { name: 'auth.test.ts', tests: 12, passed: 12, time: 145 },
      { name: 'api.test.ts', tests: 8, passed: 8, time: 89 },
      { name: 'utils.test.ts', tests: 15, passed: 14, time: 67 },
      { name: 'database.test.ts', tests: 6, passed: 6, time: 234 }
    ]
    
    if (flags.filter) {
      console.log(colors.dim(`Filter: ${flags.filter}\n`))
    }
    
    let totalTests = 0
    let totalPassed = 0
    let totalTime = 0
    
    for (const suite of tests) {
      if (flags.filter && !suite.name.includes(flags.filter)) {
        continue
      }
      
      const spin = spinner(`Running ${suite.name}...`)
      spin.start()
      
      await new Promise(resolve => setTimeout(resolve, suite.time))
      
      totalTests += suite.tests
      totalPassed += suite.passed
      totalTime += suite.time
      
      if (suite.passed === suite.tests) {
        spin.succeed(
          `${colors.green('✓')} ${suite.name} (${suite.tests}/${suite.tests}) ${colors.dim(`${suite.time}ms`)}`
        )
      } else {
        spin.fail(
          `${colors.red('✗')} ${suite.name} (${suite.passed}/${suite.tests}) ${colors.dim(`${suite.time}ms`)}`
        )
        if (flags.bail) {
          console.error(colors.red('\nBailing on first failure'))
          process.exit(1)
        }
      }
      
      if (flags.verbose) {
        console.log(colors.dim(`  → auth middleware ${colors.green('✓')}`))
        console.log(colors.dim(`  → token validation ${colors.green('✓')}`))
        console.log(colors.dim(`  → permissions check ${colors.green('✓')}`))
      }
    }
    
    // Summary
    console.log(colors.dim('\n━'.repeat(40)))
    
    if (totalPassed === totalTests) {
      console.log(colors.bold.green(`✓ All tests passed!`))
    } else {
      console.log(colors.bold.red(`✗ ${totalTests - totalPassed} tests failed`))
    }
    
    console.log(`Tests: ${colors.green(`${totalPassed} passed`)}, ${totalTests} total`)
    console.log(`Time: ${colors.yellow(`${(totalTime / 1000).toFixed(2)}s`)}`)
    
    if (flags.coverage) {
      console.log(colors.dim('\n━'.repeat(40)))
      console.log(colors.bold('Coverage Report:'))
      console.log(`Statements: ${colors.green('89.2%')} (178/200)`)
      console.log(`Branches: ${colors.yellow('76.5%')} (52/68)`)
      console.log(`Functions: ${colors.green('92.3%')} (48/52)`)
      console.log(`Lines: ${colors.green('88.9%')} (176/198)`)
    }
    
    if (flags.watch) {
      console.log(colors.gray('\n\nWatching for changes... Press Ctrl+C to stop'))
      await new Promise(() => {
        // Keep watching until interrupted
      })
    }
    
    // Exit with error if tests failed
    if (totalPassed < totalTests) {
      process.exit(1)
    }
  }
})