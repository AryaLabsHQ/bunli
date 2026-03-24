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
      const stdout = result.stdout.toString().trim()
      if (stdout) {
        process.stdout.write(stdout + '\n')
      }
      const stderr = result.stderr.toString().trim()
      if (stderr) {
        process.stderr.write(stderr + '\n')
      }
      process.exit(result.exitCode)
    } catch {
      s.fail(flags.title)
      process.exit(1)
    }
  }
})
