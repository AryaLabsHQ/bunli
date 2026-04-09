import { createPlugin } from "@bunli/core/plugin";
import type { PluginContext } from "@bunli/core/plugin";

import completionsCommand from "./commands/completions.js";
import type { CompletionsPluginOptions } from "./types.js";

export const completionsPlugin = createPlugin<CompletionsPluginOptions>((options = {}) => ({
  name: "completions",

  setup(context: PluginContext) {
    // Register the completion protocol command
    const command = completionsCommand(options);
    context.registerCommand(command);
  },
}));
