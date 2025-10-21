import { createCLI } from '@bunli/core'
import { registerTuiRenderer } from '@bunli/tui'
import { deployCommand } from './commands/deploy.js'
import { configureCommand } from './commands/configure.js'

const cli = await createCLI({
  name: 'tui-demo',
  version: '1.0.0',
  description: 'Demonstration of Bunli TUI with React'
  // generated is automatically enabled
})

// Register TUI renderer to enable render() functions
registerTuiRenderer()

cli.command(deployCommand)
cli.command(configureCommand)

await cli.run()