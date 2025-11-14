import { createPlugin } from '@bunli/core/plugin'
import type { PluginContext } from '@bunli/core/plugin'
import type { CompletionsPluginOptions } from './types.js'
import completionsCommand from './commands/completions.js'

export const completionsPlugin = createPlugin<CompletionsPluginOptions>(
  (options = {}) => ({
    name: 'completions',

    setup(context: PluginContext) {
      // Register the completions command
      const command = completionsCommand(options)
      context.registerCommand(command)
    }
  })
)
