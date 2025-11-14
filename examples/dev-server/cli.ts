#!/usr/bin/env bun

import { createCLI } from '@bunli/core'
import { configMergerPlugin } from '@bunli/plugin-config'
import { aiAgentPlugin } from '@bunli/plugin-ai-detect'
import { metricsPlugin } from './plugins/metrics.js'

// Import commands
import startCommand from './commands/start.js'
import buildCommand from './commands/build.js'
import envCommand from './commands/env.js'
import logsCommand from './commands/logs.js'

const cli = await createCLI({
  plugins: [
    configMergerPlugin({
      sources: ['.devserverrc.json', 'devserver.config.json']
    }),
    aiAgentPlugin({ verbose: true }),
    metricsPlugin
  ] as const
})

// Add commands
cli.command(startCommand)
cli.command(buildCommand)
cli.command(envCommand)
cli.command(logsCommand)

await cli.run()
