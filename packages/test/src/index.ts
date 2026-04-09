export { testCommand, testCLI } from "./test-command.js";
export { createTestCLI } from "./test-cli.js";
export { expectCommand, createMatchers } from "./matchers.js";
export {
  mockPromptResponses,
  mockShellCommands,
  mockInteractive,
  mockValidationAttempts,
  mergeTestOptions,
} from "./helpers.js";
export type {
  TestOptions,
  TestResult,
  MockHandlerArgs,
  MockShell,
  ShellPromise,
  Matchers,
} from "./types.js";
export type { TestCLIConfig, TestCLIRunResult, TestCLIInstance } from "./test-cli.js";
