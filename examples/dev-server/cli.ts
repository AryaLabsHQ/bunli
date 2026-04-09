#!/usr/bin/env bun

import { createCLI } from "@bunli/core";
import { aiAgentPlugin } from "@bunli/plugin-ai-detect";
import { configMergerPlugin } from "@bunli/plugin-config";

import buildCommand from "./commands/build.js";
import envCommand from "./commands/env.js";
import logsCommand from "./commands/logs.js";
// Import commands
import startCommand from "./commands/start.js";
import { metricsPlugin } from "./plugins/metrics.js";

const cli = await createCLI({
  plugins: [
    configMergerPlugin({
      sources: [".devserverrc.json", "devserver.config.json"],
    }),
    aiAgentPlugin({ verbose: true }),
    metricsPlugin,
  ] as const,
});

// Add commands
cli.command(startCommand);
cli.command(buildCommand);
cli.command(envCommand);
cli.command(logsCommand);

await cli.run();
