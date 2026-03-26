import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

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

    const s = spinner(flags.title)
    try {
      const proc = Bun.spawn(positional, {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).arrayBuffer(),
      ])

      if (exitCode === 0) {
        s.succeed(flags.title)
      } else {
        s.fail(flags.title)
      }
      if (stdout.byteLength > 0) {
        process.stdout.write(Buffer.from(stdout))
      }
      if (stderr.byteLength > 0) {
        process.stderr.write(Buffer.from(stderr))
      }
      process.exit(exitCode)
    } catch {
      s.fail(flags.title)
      process.exit(1)
    }
  }
})
