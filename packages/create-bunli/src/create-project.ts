import type { PromptApi, PromptSpinnerFactory } from "@bunli/core";
import type { Colors } from "@bunli/utils";
import { Result, TaggedError } from "better-result";

import { runSteps, detectPackageManager } from "./steps.js";
import type { Step } from "./steps.js";
import {
  processTemplate,
  resolveTemplateSource,
  isLocalTemplate,
  getBundledTemplatePath,
} from "./template-engine.js";
import type { CreateOptions } from "./types.js";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function stepLabel(step: Step): { running: string; done: string; failed: string } {
  switch (step.type) {
    case "install":
      return {
        running: "Installing dependencies...",
        done: "Dependencies installed",
        failed: "Failed to install dependencies",
      };
    case "git-init":
      return {
        running: "Initializing git repository...",
        done: "Git repository initialized",
        failed: "Failed to initialize git repository",
      };
    case "open-editor":
      return {
        running: "Opening editor...",
        done: "Editor opened",
        failed: "Failed to open editor",
      };
    case "command":
      return {
        running: `Running ${step.cmd}...`,
        done: `Completed ${step.cmd}`,
        failed: `Failed to run ${step.cmd}`,
      };
  }
}

const tryAsync = <TValue, TError>(
  fn: () => Promise<TValue>,
  mapError: (cause: unknown) => TError,
) => Result.tryPromise({ try: fn, catch: mapError });

interface CreateProjectOptions extends CreateOptions {
  name: string;
  dir: string;
  template: string;
  prompt: PromptApi;
  spinner: PromptSpinnerFactory;
  colors: Colors;
  shell: typeof Bun.$;
}

export class UserCancelledError extends TaggedError("UserCancelledError")<{
  message: string;
}>() {
  constructor(message: string) {
    super({ message });
  }
}

class ShellCommandError extends TaggedError("ShellCommandError")<{
  message: string;
  command: string;
  output: string;
}>() {
  constructor(command: string, output: string) {
    super({
      message: `Command failed (${command}): ${output}`,
      command,
      output,
    });
  }
}

class TemplateProcessingError extends TaggedError("TemplateProcessingError")<{
  message: string;
  cause: unknown;
}>() {
  constructor(cause: unknown) {
    super({ message: `Failed to process template: ${toErrorMessage(cause)}`, cause });
  }
}

export type CreateProjectError = UserCancelledError | ShellCommandError | TemplateProcessingError;

export async function createProject(
  options: CreateProjectOptions,
): Promise<Result<void, CreateProjectError>> {
  const { name, dir, template, git, install, prompt, spinner, colors, shell, offline } = options;

  const directoryCheck = await shell`test -d ${dir}`.nothrow();
  if (directoryCheck.exitCode === 0) {
    const overwrite = await prompt.confirm(`Directory ${dir} already exists. Overwrite?`, {
      default: false,
    });
    if (!overwrite) {
      return Result.err(new UserCancelledError("Cancelled"));
    }

    const removeDirectory = await shell`rm -rf ${dir}`.nothrow();
    if (removeDirectory.exitCode !== 0) {
      return Result.err(
        new ShellCommandError(`rm -rf ${dir}`, removeDirectory.stderr.toString().trim()),
      );
    }
  }

  const spin = spinner("Creating project structure...");
  spin.start();

  const mkdirResult = await shell`mkdir -p ${dir}`.nothrow();
  if (mkdirResult.exitCode !== 0) {
    spin.fail("Failed to create project directory");
    return Result.err(
      new ShellCommandError(`mkdir -p ${dir}`, mkdirResult.stderr.toString().trim()),
    );
  }

  let templateSource = template;
  if (await isLocalTemplate(template)) {
    templateSource = getBundledTemplatePath(template);
  } else {
    templateSource = resolveTemplateSource(template);
  }

  const templateResult = await tryAsync(
    () =>
      processTemplate({
        source: templateSource,
        dir,
        offline,
        variables: {
          name,
          version: "0.1.0",
          description: "A CLI built with Bunli",
          author: "",
          license: "MIT",
          year: new Date().getFullYear().toString(),
        },
      }),
    (cause) => new TemplateProcessingError(cause),
  );

  if (Result.isError(templateResult)) {
    spin.fail("Failed to create project");
    console.error(colors.red(templateResult.error.message));

    const cleanup = await shell`rm -rf ${dir}`.nothrow();
    if (cleanup.exitCode !== 0) {
      console.error(colors.yellow(`Warning: cleanup failed: ${cleanup.stderr.toString().trim()}`));
    }

    return templateResult;
  }

  spin.succeed("Project structure created");

  // Build post-create steps from options
  const postSteps: Step[] = [];

  if (install) {
    postSteps.push({ type: "install" });
  }

  if (git) {
    postSteps.push({
      type: "git-init",
      commit: `feat: initialize ${name} CLI project with Bunli`,
    });
  }

  // Execute post-create steps with spinner feedback
  for (const step of postSteps) {
    const label = stepLabel(step);
    const stepSpin = spinner(label.running);
    stepSpin.start();

    try {
      await runSteps(dir, [step]);
      stepSpin.succeed(label.done);
    } catch (error) {
      stepSpin.fail(label.failed);
      const message = error instanceof Error ? error.message : String(error);
      if (message) {
        console.error(colors.dim(`  ${message}`));
      }
    }
  }

  return Result.ok(undefined);
}
