export { testCommand, testCLI } from './test-command.js'
export { expectCommand, createMatchers } from './matchers.js'
export { 
  mockPromptResponses, 
  mockShellCommands, 
  mockInteractive, 
  mockValidationAttempts,
  mergeTestOptions 
} from './helpers.js'
export type { 
  TestOptions, 
  TestResult, 
  MockHandlerArgs, 
  MockShell,
  ShellPromise,
  Matchers 
} from './types.js'