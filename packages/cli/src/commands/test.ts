import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export default defineCommand({
  name: 'test',
  description: 'Run tests for your CLI',
  alias: 't',
  options: {
    pattern: option(
      z.string().or(z.array(z.string())).optional(),
      { short: 'p', description: 'Test file patterns' }
    ),
    watch: option(
      z.boolean().default(false),
      { short: 'w', description: 'Watch for changes' }
    ),
    coverage: option(
      z.boolean().default(false),
      { short: 'c', description: 'Generate coverage report' }
    ),
    bail: option(
      z.boolean().default(false),
      { short: 'b', description: 'Stop on first failure' }
    ),
    timeout: option(
      z.coerce.number().int().positive().optional(),
      { description: 'Test timeout in milliseconds' }
    ),
    all: option(
      z.boolean().default(false),
      { description: 'Run tests in all packages (workspace mode)' }
    )
  },
  handler: async ({ flags, positional, spinner, colors }) => {
    const config = await loadConfig()
    
    if (flags.all && config.workspace?.packages) {
      // Workspace mode - run tests in all packages
      const packages = config.workspace.packages
      let allPassed = true
      
      for (const packagePattern of packages) {
        const packageDirs = await findPackageDirectories(packagePattern)
        
        for (const packageDir of packageDirs) {
          const spin = spinner(`Testing ${packageDir}...`)
          spin.start()
          
          try {
            const result = await runTests(packageDir, flags, config)
            if (result.success) {
              spin.succeed(`${packageDir} tests passed`)
            } else {
              spin.fail(`${packageDir} tests failed`)
              allPassed = false
              if (flags.bail) break
            }
          } catch (error) {
            spin.fail(`${packageDir} tests failed`)
            console.error(colors.red(error instanceof Error ? error.message : String(error)))
            allPassed = false
            if (flags.bail) break
          }
        }
        if (!allPassed && flags.bail) break
      }
      
      if (!allPassed) {
        process.exit(1)
      }
    } else {
      // Single package mode
      const spin = spinner('Running tests...')
      spin.start()
      
      try {
        const result = await runTests('.', flags, config)
        if (result.success) {
          spin.succeed('All tests passed!')
          console.log(colors.green(`✓ ${result.passed} tests passed`))
          if (result.skipped > 0) {
            console.log(colors.yellow(`⊝ ${result.skipped} tests skipped`))
          }
        } else {
          spin.fail('Tests failed')
          console.log(colors.red(`✗ ${result.failed} tests failed`))
          process.exit(1)
        }
      } catch (error) {
        spin.fail('Tests failed')
        console.error(colors.red(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }
    }
  }
})

interface TestResult {
  success: boolean
  passed: number
  failed: number
  skipped: number
}

async function runTests(cwd: string, flags: any, config: any): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    // Build test command
    const args = ['test']
    
    // Test patterns
    const patterns = flags.pattern || config.test?.pattern || '**/*.test.ts'
    const patternArray = Array.isArray(patterns) ? patterns : [patterns]
    args.push(...patternArray)
    
    // Watch mode
    if (flags.watch ?? config.test?.watch) {
      args.push('--watch')
    }
    
    // Coverage
    if (flags.coverage ?? config.test?.coverage) {
      args.push('--coverage')
    }
    
    // Bail on first failure
    if (flags.bail) {
      args.push('--bail')
    }
    
    // Timeout
    if (flags.timeout) {
      args.push(`--timeout`, flags.timeout.toString())
    }
    
    const proc = spawn('bun', args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    
    let stdout = ''
    let stderr = ''
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
      process.stdout.write(data)
    })
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
      process.stderr.write(data)
    })
    
    proc.on('exit', (code) => {
      // Parse test results from output
      const passed = (stdout.match(/✓/g) || []).length
      const failed = (stdout.match(/✗/g) || []).length
      const skipped = (stdout.match(/⊝/g) || []).length
      
      resolve({
        success: code === 0,
        passed,
        failed,
        skipped
      })
    })
    
    proc.on('error', reject)
  })
}

async function findPackageDirectories(pattern: string): Promise<string[]> {
  // Simple implementation for patterns like "packages/*"
  if (pattern.endsWith('/*')) {
    const baseDir = pattern.slice(0, -2)
    if (existsSync(baseDir)) {
      const entries = await readdir(baseDir, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory() && existsSync(path.join(baseDir, entry.name, 'package.json')))
        .map(entry => path.join(baseDir, entry.name))
    }
  }
  
  return []
}
