import type { Command, CLI } from '@bunli/core'
import type { TestOptions, TestResult, MockHandlerArgs, ShellPromise } from './types.js'
import { createCLI } from '@bunli/core'

export async function testCommand(
  command: Command<any>,
  options: TestOptions = {}
): Promise<TestResult> {
  const startTime = performance.now()
  
  // Capture output
  const stdout: string[] = []
  const stderr: string[] = []
  let exitCode = 0
  let error: Error | undefined
  
  // Setup stdin mock
  const stdinLines = Array.isArray(options.stdin) 
    ? [...options.stdin]
    : options.stdin 
    ? [options.stdin]
    : []
  
  // Setup mock prompts map
  const mockPromptsMap = options.mockPrompts || {}
  const promptResponsesUsed = new Map<string, number>()
  
  // Create mock prompt
  const mockPrompt = Object.assign(
    async (message: string, options?: any): Promise<any> => {
      stdout.push(message)
      
      // Check if we have a mock response for this prompt
      let response: string
      if (mockPromptsMap[message]) {
        const responses = mockPromptsMap[message]
        const usedCount = promptResponsesUsed.get(message) || 0
        
        if (Array.isArray(responses)) {
          response = responses[usedCount] ?? responses[responses.length - 1] ?? ''
          promptResponsesUsed.set(message, usedCount + 1)
        } else {
          response = responses ?? ''
        }
      } else {
        response = stdinLines.shift() || ''
      }
      
      stdout.push(response)
      
      // Handle schema validation if provided
      if (options?.schema) {
        const result = await options.schema['~standard'].validate(response)
        if (result.issues) {
          // Simulate validation error output
          stderr.push('[red]Invalid input:[/red]')
          for (const issue of result.issues) {
            stderr.push(`[dim]  • ${issue.message}[/dim]`)
          }
          // Check if we have more responses to try
          const hasMoreMockResponses = mockPromptsMap[message] && Array.isArray(mockPromptsMap[message]) && 
            (promptResponsesUsed.get(message) || 0) < mockPromptsMap[message].length
          const hasMoreStdin = stdinLines.length > 0
          
          if (hasMoreMockResponses || hasMoreStdin) {
            return mockPrompt(message, options) // Retry with next input
          }
          // If no more inputs, return undefined like real prompt would
          return undefined
        }
        return result.value
      }
      
      // Handle custom validation
      if (options?.validate) {
        const validationResult = options.validate(response)
        if (validationResult !== true) {
          const errorMsg = typeof validationResult === 'string' ? validationResult : 'Invalid input'
          stderr.push(`✗ ${errorMsg}`)
          // Retry if more input available
          if (stdinLines.length > 0) {
            return mockPrompt(message, options)
          }
        }
      }
      
      return response
    },
    {
      confirm: async (message: string, opts?: any) => {
        stdout.push(message)
        
        let response: string
        if (mockPromptsMap[message]) {
          const responses = mockPromptsMap[message]
          const usedCount = promptResponsesUsed.get(message) || 0
          
          if (Array.isArray(responses)) {
            response = responses[usedCount] ?? responses[responses.length - 1] ?? ''
            promptResponsesUsed.set(message, usedCount + 1)
          } else {
            response = responses ?? ''
          }
        } else {
          response = stdinLines.shift() || ''
        }
        
        stdout.push(response)
        const normalized = response.toLowerCase().trim()
        return normalized === 'y' || normalized === 'yes' || (opts?.default && normalized === '')
      },
      select: async <T = string>(message: string, selectOptions: { options: any[], default?: T, hint?: string }) => {
        stdout.push(message)
        selectOptions.options.forEach((choice, i) => {
          const label = typeof choice === 'object' ? choice.label : choice
          stdout.push(`  ${i + 1}. ${label}`)
        })
        
        let response: string
        if (mockPromptsMap[message]) {
          const responses = mockPromptsMap[message]
          const usedCount = promptResponsesUsed.get(message) || 0
          
          if (Array.isArray(responses)) {
            response = responses[usedCount] ?? responses[responses.length - 1] ?? ''
            promptResponsesUsed.set(message, usedCount + 1)
          } else {
            response = responses ?? ''
          }
        } else {
          response = stdinLines.shift() || '1'
        }
        
        stdout.push(`> ${response}`)
        const index = parseInt(response) - 1
        const choice = selectOptions.options[index] || selectOptions.options[0]
        return (typeof choice === 'object' ? choice.value : choice) as T
      },
      password: async (message: string, options?: any): Promise<any> => {
        stdout.push(message)
        
        let response: string
        if (mockPromptsMap[message]) {
          const responses = mockPromptsMap[message]
          const usedCount = promptResponsesUsed.get(message) || 0
          
          if (Array.isArray(responses)) {
            response = responses[usedCount] ?? responses[responses.length - 1] ?? ''
            promptResponsesUsed.set(message, usedCount + 1)
          } else {
            response = responses ?? ''
          }
        } else {
          response = stdinLines.shift() || ''
        }
        
        stdout.push('*'.repeat(response.length))
        
        // Handle schema validation if provided
        if (options?.schema) {
          const result = await options.schema['~standard'].validate(response)
          if (result.issues) {
            stderr.push('[red]Invalid input:[/red]')
            for (const issue of result.issues) {
              stderr.push(`[dim]  • ${issue.message}[/dim]`)
            }
            // Check if we have more responses to try
            const hasMoreMockResponses = mockPromptsMap[message] && Array.isArray(mockPromptsMap[message]) && 
              (promptResponsesUsed.get(message) || 0) < mockPromptsMap[message].length
            const hasMoreStdin = stdinLines.length > 0
            
            if (hasMoreMockResponses || hasMoreStdin) {
              return mockPrompt.password(message, options) // Retry with next input
            }
            return undefined
          }
          return result.value
        }
        
        return response
      },
      multiselect: async <T = string>(message: string, selectOptions: { options: any[] }) => {
        stdout.push(message)
        selectOptions.options.forEach((choice, i) => {
          const label = typeof choice === 'object' ? choice.label : choice
          stdout.push(`  [ ] ${i + 1}. ${label}`)
        })
        
        let response: string
        if (mockPromptsMap[message]) {
          const responses = mockPromptsMap[message]
          const usedCount = promptResponsesUsed.get(message) || 0
          
          if (Array.isArray(responses)) {
            response = responses[usedCount] ?? responses[responses.length - 1] ?? ''
            promptResponsesUsed.set(message, usedCount + 1)
          } else {
            response = responses ?? ''
          }
        } else {
          response = stdinLines.shift() || ''
        }
        
        stdout.push(`> ${response}`)
        const indices = response.split(',').map(s => parseInt(s.trim()) - 1)
        return indices
          .filter(i => i >= 0 && i < selectOptions.options.length)
          .map(i => {
            const choice = selectOptions.options[i]
            return (typeof choice === 'object' ? choice.value : choice) as T
          })
      }
    }
  )
  
  // Create mock spinner
  const mockSpinner = (text?: string) => {
    if (text) stdout.push(`⠋ ${text}`)
    return {
      start: (text?: string) => {
        if (text) stdout.push(`⠋ ${text}`)
      },
      stop: (text?: string) => {
        if (text) stdout.push(text)
      },
      succeed: (text?: string) => {
        stdout.push(`✅ ${text || 'Done'}`)
      },
      fail: (text?: string) => {
        stdout.push(`❌ ${text || 'Failed'}`)
      },
      warn: (text?: string) => {
        stdout.push(`⚠️  ${text || 'Warning'}`)
      },
      info: (text?: string) => {
        stdout.push(`ℹ️  ${text || 'Info'}`)
      },
      update: (text: string) => {
        stdout.push(`⠋ ${text}`)
      }
    }
  }
  
  // Create mock shell
  const mockShellCommands = options.mockShellCommands || {}
  
  const mockShell = (strings: TemplateStringsArray, ...values: any[]) => {
    const command = strings.reduce((acc, str, i) => {
      return acc + str + (values[i] || '')
    }, '').trim()
    
    stdout.push(`$ ${command}`)
    
    const promise = Promise.resolve() as ShellPromise
    
    promise.text = async () => {
      // Check mock commands first
      if (mockShellCommands[command]) {
        return mockShellCommands[command]
      }
      
      // Default mock responses
      if (command.includes('git branch --show-current')) {
        return 'main\n'
      }
      if (command.includes('git status')) {
        return 'nothing to commit, working tree clean\n'
      }
      return ''
    }
    
    promise.json = async () => {
      // Check if we have a mock response that looks like JSON
      if (mockShellCommands[command]) {
        try {
          return JSON.parse(mockShellCommands[command])
        } catch {
          // Not JSON, return empty object
          return {} as any
        }
      }
      return {} as any
    }
    
    promise.quiet = () => promise
    
    return promise
  }
  
  // Mock colors
  const mockColors = {
    red: (text: string) => `[red]${text}[/red]`,
    green: (text: string) => `[green]${text}[/green]`,
    blue: (text: string) => `[blue]${text}[/blue]`,
    yellow: (text: string) => `[yellow]${text}[/yellow]`,
    cyan: (text: string) => `[cyan]${text}[/cyan]`,
    magenta: (text: string) => `[magenta]${text}[/magenta]`,
    gray: (text: string) => `[gray]${text}[/gray]`,
    dim: (text: string) => `[dim]${text}[/dim]`,
    bold: (text: string) => `[bold]${text}[/bold]`,
    italic: (text: string) => `[italic]${text}[/italic]`,
    underline: (text: string) => `[underline]${text}[/underline]`,
    strikethrough: (text: string) => `[strikethrough]${text}[/strikethrough]`,
    bgRed: (text: string) => `[bgRed]${text}[/bgRed]`,
    bgGreen: (text: string) => `[bgGreen]${text}[/bgGreen]`,
    bgBlue: (text: string) => `[bgBlue]${text}[/bgBlue]`,
    bgYellow: (text: string) => `[bgYellow]${text}[/bgYellow]`,
    bgCyan: (text: string) => `[bgCyan]${text}[/bgCyan]`,
    bgMagenta: (text: string) => `[bgMagenta]${text}[/bgMagenta]`,
    bgGray: (text: string) => `[bgGray]${text}[/bgGray]`,
    black: (text: string) => `[black]${text}[/black]`,
    white: (text: string) => `[white]${text}[/white]`,
    bgBlack: (text: string) => `[bgBlack]${text}[/bgBlack]`,
    bgWhite: (text: string) => `[bgWhite]${text}[/bgWhite]`,
    // Add missing bright colors
    brightRed: (text: string) => `[brightRed]${text}[/brightRed]`,
    brightGreen: (text: string) => `[brightGreen]${text}[/brightGreen]`,
    brightYellow: (text: string) => `[brightYellow]${text}[/brightYellow]`,
    brightBlue: (text: string) => `[brightBlue]${text}[/brightBlue]`,
    brightCyan: (text: string) => `[brightCyan]${text}[/brightCyan]`,
    brightMagenta: (text: string) => `[brightMagenta]${text}[/brightMagenta]`,
    brightWhite: (text: string) => `[brightWhite]${text}[/brightWhite]`,
    reset: (text: string) => `[reset]${text}[/reset]`,
    strip: (text: string) => text.replace(/\[[^\]]+\]/g, '')
  }
  
  // Override console methods
  const originalLog = console.log
  const originalError = console.error
  
  console.log = (...args: any[]) => {
    stdout.push(args.join(' '))
  }
  
  console.error = (...args: any[]) => {
    stderr.push(args.join(' '))
  }
  
  try {
    // Create handler args
    const handlerArgs: MockHandlerArgs = {
      flags: options.flags || {},
      positional: options.args || [],
      env: { ...process.env, ...(options.env || {}) },
      cwd: options.cwd || process.cwd(),
      prompt: mockPrompt,
      spinner: mockSpinner,
      shell: mockShell as any,
      colors: mockColors
    }
    
    // Execute command handler
    if (command.handler) {
      await command.handler(handlerArgs as any)
    }
    
    exitCode = options.exitCode || 0
  } catch (err) {
    error = err as Error
    exitCode = 1
    stderr.push(error.message)
  } finally {
    // Restore console methods
    console.log = originalLog
    console.error = originalError
  }
  
  const duration = performance.now() - startTime
  
  return {
    stdout: stdout.join('\n'),
    stderr: stderr.join('\n'),
    exitCode,
    duration,
    error
  }
}

export async function testCLI(
  setupCLI: (cli: CLI) => void,
  argv: string[],
  options: Omit<TestOptions, 'args'> = {}
): Promise<TestResult> {
  const startTime = performance.now()
  
  // Capture output
  const stdout: string[] = []
  const stderr: string[] = []
  let exitCode = 0
  let error: Error | undefined
  
  // Override console methods
  const originalLog = console.log
  const originalError = console.error
  const originalExit = process.exit
  
  console.log = (...args: any[]) => {
    stdout.push(args.join(' '))
  }
  
  console.error = (...args: any[]) => {
    stderr.push(args.join(' '))
  }
  
  ;(process.exit as any) = (code?: number) => {
    exitCode = code || 0
    throw new Error(`Process exited with code ${exitCode}`)
  }
  
  try {
    // Create and setup CLI
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI'
    })
    
    setupCLI(cli)
    
    // Run CLI with arguments
    await cli.run(argv)
    
  } catch (err: any) {
    if (!err.message.startsWith('Process exited with code')) {
      error = err
      exitCode = 1
      stderr.push(error?.message || 'Unknown error')
    }
  } finally {
    // Restore methods
    console.log = originalLog
    console.error = originalError
    process.exit = originalExit
  }
  
  const duration = performance.now() - startTime
  
  return {
    stdout: stdout.join('\n'),
    stderr: stderr.join('\n'),
    exitCode,
    duration,
    error
  }
}