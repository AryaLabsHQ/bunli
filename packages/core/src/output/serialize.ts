import { SchemaError, getDotPath } from "@standard-schema/utils";
import { isTaggedError, matchError } from "better-result";

import { ConfigLoadError, ConfigNotFoundError } from "../config-loader.js";
import {
  BunliValidationError,
  CommandExecutionError,
  CommandNotFoundError,
  InvalidConfigError,
  OptionValidationError,
} from "../errors.js";

export interface SerializedCliIssue {
  message: string;
  path?: string;
}

type KnownCliTaggedError =
  | BunliValidationError
  | CommandExecutionError
  | CommandNotFoundError
  | ConfigLoadError
  | ConfigNotFoundError
  | InvalidConfigError
  | OptionValidationError;

type SerializedTaggedErrorBase<E extends KnownCliTaggedError> = {
  name: E["name"];
  tag: E["_tag"];
  message: E["message"];
};

export type SerializedSchemaCliError = {
  kind: "schema";
  name: "SchemaError";
  tag: "SchemaError";
  message: string;
  issues: SerializedCliIssue[];
};

export type SerializedValidationCliError = SerializedTaggedErrorBase<BunliValidationError> & {
  kind: "validation";
  command: BunliValidationError["command"];
  option: BunliValidationError["option"];
  expectedType: BunliValidationError["expectedType"];
  hint?: BunliValidationError["hint"];
};

export type SerializedOptionValidationCliError =
  SerializedTaggedErrorBase<OptionValidationError> & {
    kind: "option-validation";
    command: OptionValidationError["command"];
    option: OptionValidationError["option"];
    issues: SerializedCliIssue[];
  };

export type SerializedCommandNotFoundCliError = SerializedTaggedErrorBase<CommandNotFoundError> & {
  kind: "command-not-found";
  command: CommandNotFoundError["command"];
  available: CommandNotFoundError["available"];
  suggestion?: CommandNotFoundError["suggestion"];
};

export type SerializedCommandExecutionCliError =
  SerializedTaggedErrorBase<CommandExecutionError> & {
    kind: "command-execution";
    command: CommandExecutionError["command"];
  };

export type SerializedConfigNotFoundCliError = SerializedTaggedErrorBase<ConfigNotFoundError> & {
  kind: "config-not-found";
  searched: ConfigNotFoundError["searched"];
};

export type SerializedConfigLoadCliError = SerializedTaggedErrorBase<ConfigLoadError> & {
  kind: "config-load";
  path: ConfigLoadError["path"];
};

export type SerializedInvalidConfigCliError = SerializedTaggedErrorBase<InvalidConfigError> & {
  kind: "invalid-config";
};

export type SerializedTaggedFallbackCliError = {
  kind: "tagged-error";
  name: string;
  tag: string;
  message: string;
};

export type SerializedUnknownCliError = {
  kind: "error";
  name: string;
  message: string;
};

export type SerializedCliError =
  | SerializedSchemaCliError
  | SerializedValidationCliError
  | SerializedOptionValidationCliError
  | SerializedCommandNotFoundCliError
  | SerializedCommandExecutionCliError
  | SerializedConfigNotFoundCliError
  | SerializedConfigLoadCliError
  | SerializedInvalidConfigCliError
  | SerializedTaggedFallbackCliError
  | SerializedUnknownCliError;

function toSerializedIssues(
  issues: Array<{ message: string; path?: string }>,
): SerializedCliIssue[] {
  return issues.map((issue) => ({
    message: issue.message,
    ...(issue.path ? { path: issue.path } : {}),
  }));
}

function serializeTaggedErrorBase<E extends KnownCliTaggedError>(
  error: E,
): SerializedTaggedErrorBase<E> {
  return {
    name: error.name,
    tag: error._tag,
    message: error.message,
  };
}

function isKnownCliTaggedError(error: unknown): error is KnownCliTaggedError {
  return (
    BunliValidationError.is(error) ||
    CommandExecutionError.is(error) ||
    CommandNotFoundError.is(error) ||
    ConfigLoadError.is(error) ||
    ConfigNotFoundError.is(error) ||
    InvalidConfigError.is(error) ||
    OptionValidationError.is(error)
  );
}

function serializeKnownCliTaggedError(
  error: KnownCliTaggedError,
): Exclude<
  SerializedCliError,
  SerializedSchemaCliError | SerializedTaggedFallbackCliError | SerializedUnknownCliError
> {
  return matchError(error, {
    BunliValidationError: (current) => ({
      kind: "validation",
      ...serializeTaggedErrorBase(current),
      command: current.command,
      option: current.option,
      expectedType: current.expectedType,
      ...(current.hint ? { hint: current.hint } : {}),
    }),
    CommandExecutionError: (current) => ({
      kind: "command-execution",
      ...serializeTaggedErrorBase(current),
      command: current.command,
    }),
    CommandNotFoundError: (current) => ({
      kind: "command-not-found",
      ...serializeTaggedErrorBase(current),
      command: current.command,
      available: current.available,
      ...(current.suggestion ? { suggestion: current.suggestion } : {}),
    }),
    ConfigLoadError: (current) => ({
      kind: "config-load",
      ...serializeTaggedErrorBase(current),
      path: current.path,
    }),
    ConfigNotFoundError: (current) => ({
      kind: "config-not-found",
      ...serializeTaggedErrorBase(current),
      searched: current.searched,
    }),
    InvalidConfigError: (current) => ({
      kind: "invalid-config",
      ...serializeTaggedErrorBase(current),
    }),
    OptionValidationError: (current) => ({
      kind: "option-validation",
      ...serializeTaggedErrorBase(current),
      command: current.command,
      option: current.option,
      issues: toSerializedIssues(current.issues),
    }),
  });
}

export function serializeCliError(error: unknown): SerializedCliError {
  if (error instanceof SchemaError) {
    return {
      kind: "schema",
      name: "SchemaError",
      tag: "SchemaError",
      message: "Validation failed",
      issues: error.issues.map((issue) => {
        const path = getDotPath(issue);
        return {
          message: issue.message,
          ...(path ? { path } : {}),
        };
      }),
    };
  }

  if (isKnownCliTaggedError(error)) {
    return serializeKnownCliTaggedError(error);
  }

  if (isTaggedError(error)) {
    return {
      kind: "tagged-error",
      name: error.name,
      tag: error._tag,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      kind: "error",
      name: error.name || "Error",
      message: error.message || String(error),
    };
  }

  return {
    kind: "error",
    name: "Error",
    message: String(error),
  };
}
