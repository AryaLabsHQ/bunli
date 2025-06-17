import type { TestOptions } from './types.js'

/**
 * Helper to create test options with mock prompt responses
 * @param responses - Map of prompt messages to responses
 * @example
 * mockPromptResponses({
 *   'Enter name:': 'Alice',
 *   'Enter age:': ['invalid', '25'], // Multiple attempts for validation
 *   'Continue?': 'y'
 * })
 */
export function mockPromptResponses(responses: Record<string, string | string[]>): Pick<TestOptions, 'mockPrompts'> {
  return { mockPrompts: responses }
}

/**
 * Helper to create test options with mock shell command outputs
 * @param commands - Map of shell commands to their outputs
 * @example
 * mockShellCommands({
 *   'git status': 'On branch main\nnothing to commit',
 *   'npm --version': '10.2.0',
 *   'node --version': 'v20.10.0'
 * })
 */
export function mockShellCommands(commands: Record<string, string>): Pick<TestOptions, 'mockShellCommands'> {
  return { mockShellCommands: commands }
}

/**
 * Helper to create test options for interactive commands
 * @param prompts - Prompt responses
 * @param commands - Shell command outputs
 * @example
 * mockInteractive(
 *   { 'Name:': 'Alice', 'Continue?': 'y' },
 *   { 'git status': 'clean' }
 * )
 */
export function mockInteractive(
  prompts: Record<string, string | string[]>,
  commands?: Record<string, string>
): TestOptions {
  return {
    ...mockPromptResponses(prompts),
    ...(commands ? mockShellCommands(commands) : {})
  }
}

/**
 * Helper to create stdin input for validation testing
 * Useful for testing retry behavior with invalid inputs
 * @param attempts - Array of input attempts
 * @example
 * mockValidationAttempts(['invalid-email', 'still-bad', 'valid@email.com'])
 */
export function mockValidationAttempts(attempts: string[]): Pick<TestOptions, 'stdin'> {
  return { stdin: attempts }
}

/**
 * Helper to combine multiple test option objects
 * @param options - Test option objects to merge
 * @example
 * mergeTestOptions(
 *   { flags: { verbose: true } },
 *   mockPromptResponses({ 'Name:': 'Alice' }),
 *   { env: { NODE_ENV: 'test' } }
 * )
 */
export function mergeTestOptions(...options: Partial<TestOptions>[]): TestOptions {
  const merged: TestOptions = {}
  
  for (const opt of options) {
    // Handle stdin/mockPrompts specially to combine them
    if (opt.stdin || opt.mockPrompts) {
      const stdinArray: string[] = []
      
      // Add existing stdin
      if (merged.stdin) {
        if (Array.isArray(merged.stdin)) {
          stdinArray.push(...merged.stdin)
        } else {
          stdinArray.push(merged.stdin)
        }
      }
      
      // Add new stdin
      if (opt.stdin) {
        if (Array.isArray(opt.stdin)) {
          stdinArray.push(...opt.stdin)
        } else {
          stdinArray.push(opt.stdin)
        }
      }
      
      if (stdinArray.length > 0) {
        merged.stdin = stdinArray
      }
    }
    
    // Merge other properties
    Object.assign(merged, opt)
  }
  
  return merged
}