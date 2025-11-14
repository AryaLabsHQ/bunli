import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { generateBash, generateZsh, generateFish } from '../generators/index.js'
import { loadMetadata, getCLIName } from '../utils/metadata.js'
import { getInstallInstructions } from '../utils/instructions.js'
import type { CompletionsPluginOptions } from '../types.js'

export default function completionsCommand(pluginOptions: CompletionsPluginOptions) {
  return defineCommand({
    name: 'completions',
    description: 'Generate shell completion scripts',
    options: {
      shell: option(
        z.enum(['bash', 'zsh', 'fish']),
        {
          short: 's',
          description: 'Target shell (bash, zsh, or fish)'
        }
      ),
      output: option(
        z.string().optional(),
        {
          short: 'o',
          description: 'Output file path (default: stdout)'
        }
      )
    },

    handler: async ({ flags, colors, spinner }) => {
      const spin = spinner('Generating completions...')

      try {
        // Load command metadata
        const metadata = await loadMetadata()
        const cliName = await getCLIName()

        // Generate appropriate completion script
        let script: string
        switch (flags.shell) {
          case 'bash':
            script = generateBash(metadata, cliName)
            break
          case 'zsh':
            script = generateZsh(metadata, cliName)
            break
          case 'fish':
            script = generateFish(metadata, cliName)
            break
        }

        spin.succeed(`Generated ${flags.shell} completions`)

        // Output to file or stdout
        if (flags.output) {
          await Bun.write(flags.output, script)
          console.log(colors.green(`\n✅ Completions written to: ${flags.output}`))
        } else {
          console.log('\n' + script)
        }

        // Show installation instructions if outputting to stdout
        if (!flags.output) {
          console.log(colors.dim(getInstallInstructions(flags.shell, cliName)))
        }

      } catch (error) {
        spin.fail('Failed to generate completions')
        if (error instanceof Error) {
          console.error(colors.red(`\nError: ${error.message}`))
        } else {
          console.error(colors.red(`\nError: ${String(error)}`))
        }
        throw error
      }
    }
  })
}
