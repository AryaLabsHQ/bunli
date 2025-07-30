#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import { tuiPlugin } from '@bunli/plugin-tui'
import { newProjectCommand } from './commands/new-project.js'
import { configureCommand } from './commands/configure.js'
import { deployCommand } from './commands/deploy.js'
import { customTuiCommand } from './commands/custom-tui.js'

const cli = await createCLI({
  name: 'tui-demo',
  version: '1.0.0',
  description: 'Demonstration of Bunli TUI capabilities',
  plugins: [
    tuiPlugin({
      theme: 'dark',
      autoForm: true,
      renderer: {
        fps: 60,
        mouseSupport: true
      }
    })
  ] as const
})

// Register commands
cli.command(newProjectCommand)
cli.command(configureCommand)
cli.command(deployCommand)
cli.command(customTuiCommand)

// Run CLI
await cli.run()