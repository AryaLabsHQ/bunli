import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { $ } from 'bun'

export default defineCommand({
  name: 'spin',
  description: 'Run a command with a spinner',
  options: {
    title: option(z.string().optional().default('Loading...'), { description: 'Spinner title' }),
  },
  async handler({ flags, positional, spinner }) {
    if (positional.length === 0) {
      process.stderr.write('Error: no command provided\n')
      process.exit(1)
    }

    const command = positional.join(' ')
    const s = spinner(flags.title)
    try {
      const result = await $`sh -c ${command}`.quiet().nothrow()
      if (result.exitCode === 0) {
        s.succeed(flags.title)
      } else {
        s.fail(flags.title)
      }
      if (result.stdout.length > 0) {
        process.stdout.write(result.stdout)
      }
      if (result.stderr.length > 0) {
        process.stderr.write(result.stderr)
      }
      process.exit(result.exitCode)
    } catch {
      s.fail(flags.title)
      process.exit(1)
    }
  }
})
