import { TaggedError } from "better-result";

export interface BunliValidationErrorContext {
  option: string;
  value: unknown;
  command: string;
  expectedType: string;
  hint?: string;
}

export class InvalidConfigError extends TaggedError("InvalidConfigError")<{
  message: string;
  cause: unknown;
}>() {}

export class CommandNotFoundError extends TaggedError("CommandNotFoundError")<{
  message: string;
  command: string;
  available: string[];
  suggestion?: string;
}>() {}

export class CommandExecutionError extends TaggedError("CommandExecutionError")<{
  message: string;
  command: string;
  cause: unknown;
}>() {}

export class OptionValidationError extends TaggedError("OptionValidationError")<{
  message: string;
  command: string;
  option: string;
  cause: unknown;
  issues: Array<{ message: string; path?: string }>;
}>() {}

export class BunliValidationError extends TaggedError("BunliValidationError")<{
  message: string;
  option: string;
  value: unknown;
  command: string;
  expectedType: string;
  hint?: string;
}>() {
  constructor(message: string, context: BunliValidationErrorContext) {
    super({ message, ...context });
  }

  get context(): BunliValidationErrorContext {
    return {
      option: this.option,
      value: this.value,
      command: this.command,
      expectedType: this.expectedType,
      ...(this.hint ? { hint: this.hint } : {}),
    };
  }

  override toString(): string {
    return `${this.name}: Invalid option '${this.option}' for command '${this.command}'
    
Expected: ${this.expectedType}
Received: ${typeof this.value} (${JSON.stringify(this.value)})
${this.hint ? `\nHint: ${this.hint}` : ""}`;
  }
}
