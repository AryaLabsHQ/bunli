import type { TestResult } from './types.js'

export interface Matchers {
  toHaveExitCode(code: number): void
  toHaveSucceeded(): void
  toHaveFailed(): void
  toContainInStdout(text: string): void
  toContainInStderr(text: string): void
  toMatchStdout(pattern: RegExp): void
  toMatchStderr(pattern: RegExp): void
}

export function createMatchers(result: TestResult): Matchers {
  return {
    toHaveExitCode(code: number) {
      if (result.exitCode !== code) {
        throw new Error(
          `Expected exit code ${code}, but got ${result.exitCode}\n` +
          `stdout: ${result.stdout}\n` +
          `stderr: ${result.stderr}`
        )
      }
    },
    
    toHaveSucceeded() {
      if (result.exitCode !== 0) {
        throw new Error(
          `Expected command to succeed (exit code 0), but got ${result.exitCode}\n` +
          `stdout: ${result.stdout}\n` +
          `stderr: ${result.stderr}\n` +
          (result.error ? `error: ${result.error.message}` : '')
        )
      }
    },
    
    toHaveFailed() {
      if (result.exitCode === 0) {
        throw new Error(
          `Expected command to fail (non-zero exit code), but it succeeded\n` +
          `stdout: ${result.stdout}`
        )
      }
    },
    
    toContainInStdout(text: string) {
      if (!result.stdout.includes(text)) {
        throw new Error(
          `Expected stdout to contain "${text}"\n` +
          `stdout: ${result.stdout}`
        )
      }
    },
    
    toContainInStderr(text: string) {
      if (!result.stderr.includes(text)) {
        throw new Error(
          `Expected stderr to contain "${text}"\n` +
          `stderr: ${result.stderr}`
        )
      }
    },
    
    toMatchStdout(pattern: RegExp) {
      if (!pattern.test(result.stdout)) {
        throw new Error(
          `Expected stdout to match ${pattern}\n` +
          `stdout: ${result.stdout}`
        )
      }
    },
    
    toMatchStderr(pattern: RegExp) {
      if (!pattern.test(result.stderr)) {
        throw new Error(
          `Expected stderr to match ${pattern}\n` +
          `stderr: ${result.stderr}`
        )
      }
    }
  }
}

// Extend expect for better integration
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveExitCode(code: number): R
      toHaveSucceeded(): R
      toHaveFailed(): R
      toContainInStdout(text: string): R
      toContainInStderr(text: string): R
      toMatchStdout(pattern: RegExp): R
      toMatchStderr(pattern: RegExp): R
    }
  }
}

// Helper to add matchers to expect result
export function expectCommand(result: TestResult) {
  const matchers = createMatchers(result)
  
  return {
    ...result,
    ...matchers
  }
}