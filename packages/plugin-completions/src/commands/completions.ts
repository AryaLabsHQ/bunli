import { defineCommand } from '@bunli/core'
import { RootCommand } from '@bomb.sh/tab'
import type { CompletionsPluginOptions, ShellType } from '../types.js'
import { loadGeneratedMetadata, resolveCliInfo } from '../utils/metadata.js'
import { buildRegistry } from '../tab/registry.js'

const SHELLS: ReadonlyArray<ShellType> = ['bash', 'zsh', 'fish', 'powershell']

function isShell(value: string): value is ShellType {
  return (SHELLS as readonly string[]).includes(value)
}

export default function completionsCommand(pluginOptions: CompletionsPluginOptions) {
  return defineCommand({
    name: 'completions',
    alias: ['complete'], // Tab's generated scripts call back into `complete -- ...`
    description: 'Generate shell completion scripts and handle completion protocol callbacks',

    handler: async ({ runtime, colors }) => {
      const argv = runtime.args
      const invokedCommand = runtime.command.split(/\s+/).at(-1) ?? 'completions'
      const isProtocolCommand = invokedCommand === 'complete'

      if (!isProtocolCommand) {
        // Script generation: "my-cli completions zsh|bash|fish|powershell"
        const first = argv[0]
        if (argv.length === 1 && typeof first === 'string' && isShell(first)) {
          const shell = first
          const { commandName, executable } = await resolveCliInfo(pluginOptions)
          const root = new RootCommand()
          root.setup(commandName, executable, shell)
          return
        }

        console.error(colors.red('Missing or invalid shell name for completions script generation.'))
        console.error(colors.dim('Usage: <cli> completions <bash|zsh|fish|powershell>'))
        console.error(colors.dim('Protocol callback form: <cli> complete -- <args...>'))
        return
      }

      // Dynamic completion protocol: "my-cli complete -- <args...>"
      // Important: Tab uses a trailing empty-string sentinel to represent "ends with space".
      // Bunli's parseArgs drops empty strings, so we MUST use runtime.args, not parsed positional args.
      try {
        const { commands } = await loadGeneratedMetadata(pluginOptions)
        const root = buildRegistry(commands, {
          includeAliases: pluginOptions.includeAliases,
          includeGlobalFlags: pluginOptions.includeGlobalFlags
        })
        root.parse(argv)
      } catch (error) {
        // Shell completion callbacks should always end with a directive line.
        // Avoid printing stack traces that may break completion parsing.
        console.log(':1')
        if (process.env.BUNLI_DEBUG_COMPLETIONS) {
          console.error(colors.red(error instanceof Error ? error.message : String(error)))
        }
      }
    }
  })
}
