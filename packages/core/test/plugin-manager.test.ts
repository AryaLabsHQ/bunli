import { expect, test } from "bun:test";

import { PluginManager } from "../src/plugin/manager.js";

test("runPostRun does not leak error state into afterCommand contexts", async () => {
  let afterCommandError: unknown = Symbol("unset");
  let afterCommandHasGetter = false;

  const plugin = {
    name: "after-command-observer",
    async afterCommand(context: { error?: unknown; getStoreValue?: unknown }) {
      afterCommandError = context.error;
      afterCommandHasGetter = typeof context.getStoreValue === "function";
    },
  };

  const manager = new PluginManager();
  await manager.loadPlugins([plugin]);

  const command = {
    name: "test",
    description: "Test command",
    handler: async () => {},
  };

  const context = await manager.runBeforeCommand("test", command, [], {});
  const handlerError = new Error("boom");

  await manager.runPostRun(
    context,
    { exitCode: 1, error: handlerError },
    manager.createExecutionState(),
  );

  expect((context as Record<string, unknown>).error).toBeUndefined();

  await manager.runAfterCommand(context, { exitCode: 1 });

  expect(afterCommandError).toBeUndefined();
  expect(afterCommandHasGetter).toBe(true);
});
