import { afterEach, describe, expect, test } from "bun:test";

import { PromptCancelledError } from "@bunli/runtime/prompt";

import { createCLI } from "../src/cli.js";
import type { TerminalInfo } from "../src/types.js";

function interactiveTerminal(): TerminalInfo {
  return {
    width: 120,
    height: 40,
    isInteractive: true,
    isCI: false,
    supportsColor: true,
    supportsMouse: true,
  };
}

function nonInteractiveTerminal(): TerminalInfo {
  return {
    width: 80,
    height: 24,
    isInteractive: false,
    isCI: false,
    supportsColor: false,
    supportsMouse: false,
  };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("TUI renderer option plumbing", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  test("core forwards rendererOptions (including bufferMode default) to the TUI render bridge", async () => {
    let capturedBufferMode: unknown;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
      },
      {
        getTerminalInfo: interactiveTerminal,
        runTuiRender: async (args) => {
          capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)
            ?.bufferMode;
        },
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      render: () => null,
    });

    await cli.run(["ui"]);

    expect(capturedBufferMode).toBe("standard");
  });

  test("auto-wires @bunli/runtime renderer for render commands without manual registration", async () => {
    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
      },
      {
        getTerminalInfo: interactiveTerminal,
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      render: () => null,
    });

    await expect(cli.execute("ui")).rejects.toThrow("TUI render result is missing");
  });

  test("config tui.renderer.bufferMode is forwarded", async () => {
    let capturedBufferMode: unknown;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
        tui: {
          renderer: {
            bufferMode: "alternate",
          },
        },
      },
      {
        getTerminalInfo: interactiveTerminal,
        runTuiRender: async (args) => {
          capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)
            ?.bufferMode;
        },
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      render: () => null,
    });

    await cli.run(["ui"]);

    expect(capturedBufferMode).toBe("alternate");
  });

  test("command-level tui.renderer overrides global config", async () => {
    let capturedBufferMode: unknown;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
        tui: {
          renderer: {
            bufferMode: "alternate",
          },
        },
      },
      {
        getTerminalInfo: interactiveTerminal,
        runTuiRender: async (args) => {
          capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)
            ?.bufferMode;
        },
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      tui: {
        renderer: {
          bufferMode: "standard",
        },
      },
      render: () => null,
    });

    await cli.run(["ui"]);

    expect(capturedBufferMode).toBe("standard");
  });

  test("core resolves image mode precedence: config default auto, command override, and --image-mode flag", async () => {
    const captured: Array<{ mode: unknown; protocol: unknown; width: unknown; height: unknown }> =
      [];

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
        tui: {
          renderer: {},
          image: {
            mode: "on",
            protocol: "kitty",
            width: 80,
          },
        },
      },
      {
        getTerminalInfo: interactiveTerminal,
        runTuiRender: async (args) => {
          captured.push({
            mode: (args as { image?: Record<string, unknown> }).image?.mode,
            protocol: (args as { image?: Record<string, unknown> }).image?.protocol,
            width: (args as { image?: Record<string, unknown> }).image?.width,
            height: (args as { image?: Record<string, unknown> }).image?.height,
          });
        },
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      tui: {
        image: {
          mode: "off",
          height: 20,
        },
      },
      render: () => null,
    });

    await cli.run(["ui"]);
    await cli.run(["ui", "--image-mode=auto"]);

    expect(captured).toHaveLength(2);
    expect(captured[0]).toEqual({
      mode: "off",
      protocol: "kitty",
      width: 80,
      height: 20,
    });
    expect(captured[1]).toEqual({
      mode: "auto",
      protocol: "kitty",
      width: 80,
      height: 20,
    });
  });

  test("handler receives resolved image options", async () => {
    let capturedMode: unknown;
    let capturedProtocol: unknown;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
        tui: {
          renderer: {},
          image: {
            mode: "auto",
            protocol: "kitty",
          },
        },
      },
      {
        getTerminalInfo: nonInteractiveTerminal,
      },
    );

    cli.command({
      name: "status",
      description: "status",
      handler: async (args) => {
        capturedMode = args.image.mode;
        capturedProtocol = args.image.protocol;
      },
    });

    await cli.run(["status", "--image-mode=on"]);

    expect(capturedMode).toBe("on");
    expect(capturedProtocol).toBe("kitty");
  });

  test("non-interactive terminals fall back to handler when present", async () => {
    let renderCalled = false;
    let handlerCalled = false;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
      },
      {
        getTerminalInfo: nonInteractiveTerminal,
        runTuiRender: async () => {
          renderCalled = true;
        },
      },
    );

    cli.command({
      name: "ui",
      description: "ui",
      handler: async () => {
        handlerCalled = true;
      },
      render: () => null,
    });

    await cli.run(["ui"]);

    expect(renderCalled).toBe(false);
    expect(handlerCalled).toBe(true);
  });

  test("render-only commands error on non-interactive terminals", async () => {
    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
      },
      {
        getTerminalInfo: nonInteractiveTerminal,
      },
    );

    cli.command({
      name: "inline-ui",
      description: "inline-ui",
      render: () => null,
    });

    await expect(cli.execute("inline-ui")).rejects.toThrow(
      "Command does not provide a handler for non-TUI execution",
    );
  });

  test("handler PromptCancelledError exits gracefully and reports exitCode 0 to plugins", async () => {
    const exitCodes: number[] = [];

    const cli = await createCLI({
      name: "test-cli",
      version: "0.0.0",
      plugins: [
        {
          name: "capture-exit-code",
          afterCommand(context) {
            exitCodes.push(context.exitCode ?? -1);
          },
        },
      ],
    });

    cli.command({
      name: "cancel-handler",
      description: "cancel-handler",
      handler: async () => {
        throw new PromptCancelledError("Cancelled");
      },
    });

    await cli.run(["cancel-handler"]);

    expect(exitCodes).toEqual([0]);
  });

  test("render PromptCancelledError exits gracefully and reports exitCode 0 to plugins", async () => {
    const exitCodes: number[] = [];

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [
          {
            name: "capture-exit-code",
            afterCommand(context) {
              exitCodes.push(context.exitCode ?? -1);
            },
          },
        ],
      },
      {
        getTerminalInfo: interactiveTerminal,
        runTuiRender: async () => {
          throw new PromptCancelledError("Cancelled");
        },
      },
    );

    cli.command({
      name: "cancel-render",
      description: "cancel-render",
      render: () => null,
    });

    await cli.run(["cancel-render"]);

    expect(exitCodes).toEqual([0]);
  });

  test("interrupt waits for in-flight handler work before returning", async () => {
    let handlerCompleted = false;

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [],
      },
      {
        getTerminalInfo: interactiveTerminal,
      },
    );

    cli.command({
      name: "slow-handler",
      description: "slow-handler",
      handler: async () => {
        await delay(40);
        handlerCompleted = true;
      },
    });

    const runPromise = cli.run(["slow-handler"]);
    setTimeout(() => {
      process.emit("SIGINT");
    }, 5);

    await runPromise;
    expect(handlerCompleted).toBe(true);
  });

  test("SIGTERM is treated as termination and reports exitCode 1", async () => {
    const exitCodes: number[] = [];

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [
          {
            name: "capture-exit-code",
            afterCommand(context) {
              exitCodes.push(context.exitCode ?? -1);
            },
          },
        ],
      },
      {
        getTerminalInfo: interactiveTerminal,
      },
    );

    cli.command({
      name: "term-handler",
      description: "term-handler",
      handler: async () => {
        await delay(40);
      },
    });

    const execPromise = cli.execute("term-handler");
    setTimeout(() => {
      process.emit("SIGTERM");
    }, 5);

    await expect(execPromise).rejects.toThrow("Terminated");
    expect(exitCodes).toEqual([1]);
  });

  test("interrupt during afterCommand does not execute hooks twice", async () => {
    let afterCommandCalls = 0;
    let resolveAfterStart: (() => void) | undefined;
    const afterStarted = new Promise<void>((resolve) => {
      resolveAfterStart = resolve;
    });

    const cli = await createCLI(
      {
        name: "test-cli",
        version: "0.0.0",
        plugins: [
          {
            name: "slow-after-command",
            async afterCommand() {
              afterCommandCalls += 1;
              resolveAfterStart?.();
              await delay(40);
            },
          },
        ],
      },
      {
        getTerminalInfo: nonInteractiveTerminal,
      },
    );

    cli.command({
      name: "after-hook",
      description: "after-hook",
      handler: async () => {},
    });

    const execPromise = cli.execute("after-hook");
    await afterStarted;
    process.emit("SIGINT");
    await execPromise;

    expect(afterCommandCalls).toBe(1);
  });
});
