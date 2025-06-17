import type { Command, HandlerArgs } from '@bunli/core'

export interface TestOptions {
  /** Command flags to pass */
  flags?: Record<string, unknown>
  /** Positional arguments */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Current working directory */
  cwd?: string
  /** Input for prompts (line by line) */
  stdin?: string | string[]
  /** Mock prompt responses mapped by prompt message */
  mockPrompts?: Record<string, string | string[]>
  /** Mock shell command outputs */
  mockShellCommands?: Record<string, string>
  /** Exit code to expect */
  exitCode?: number
}

export interface TestResult {
  /** Captured stdout */
  stdout: string
  /** Captured stderr */
  stderr: string
  /** Exit code */
  exitCode: number
  /** Execution time in ms */
  duration: number
  /** Any error thrown */
  error?: Error
}

export interface MockHandlerArgs extends Omit<HandlerArgs, 'prompt' | 'spinner' | 'shell'> {
  prompt: {
    (message: string, options?: any): Promise<string>
    confirm: (message: string, options?: any) => Promise<boolean>
    select: <T = string>(message: string, options: any) => Promise<T>
    password: (message: string, options?: any) => Promise<string>
    multiselect: <T = string>(message: string, options: any) => Promise<T[]>
  }
  spinner: (text?: string) => {
    start: (text?: string) => void
    stop: (text?: string) => void
    succeed: (text?: string) => void
    fail: (text?: string) => void
    warn: (text?: string) => void
    info: (text?: string) => void
    update: (text: string) => void
  }
  shell: MockShell
}

export interface Matchers {
  toHaveExitCode(code: number): void
  toHaveSucceeded(): void
  toHaveFailed(): void
  toContainInStdout(text: string): void
  toContainInStderr(text: string): void
  toMatchStdout(pattern: RegExp): void
  toMatchStderr(pattern: RegExp): void
}

export interface MockShell {
  (strings: TemplateStringsArray, ...values: any[]): ShellPromise
}

export interface ShellPromise extends Promise<void> {
  text(): Promise<string>
  json<T = any>(): Promise<T>
  quiet(): ShellPromise
}