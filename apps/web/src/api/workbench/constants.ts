export const WORKBENCH_WORKSPACE = "/workspace/demo";
export const WORKBENCH_FILE_PATH = `${WORKBENCH_WORKSPACE}/src/index.ts`;
export const WORKBENCH_SRC_DIR = `${WORKBENCH_WORKSPACE}/src`;
export const WORKBENCH_RUN_TIMEOUT_MS = 10_000;
export const WORKBENCH_SLEEP_AFTER = "10m";
export const WORKBENCH_SESSION_TTL_SECONDS = 60 * 30;

export type RunPreset = "framework" | "toolchain";

export const PRESET_COMMANDS: Record<RunPreset, string> = {
  framework: "bun run /workspace/demo/src/index.ts",
  toolchain: "bun --version && bunli --version && bunli --help",
};

export const DEFAULT_SOURCE_FILE = `import { createCLI, defineCommand, option } from "bunli";
import { z } from "zod";

const hello = defineCommand({
  name: "hello",
  description: "Say hello",
  options: {
    name: option(z.string().default("world"), {
      short: "n",
      description: "Who to greet",
    }),
    loud: option(z.boolean().default(false), {
      short: "l",
      description: "Shout it",
    }),
  },
  handler({ flags }) {
    const msg = \`Hello, \${flags.name}!\`;
    console.log(flags.loud ? msg.toUpperCase() : msg);
  },
});

const cli = await createCLI({
  name: "my-cli",
  version: "1.0.0",
  commands: [hello],
});

await cli.run();
`;
