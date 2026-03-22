export const DEFAULT_WORKBENCH_WORKSPACE = "/workspace/demo";
export const WORKBENCH_RUN_TIMEOUT_MS = 10_000;
export const WORKBENCH_SLEEP_AFTER = "10m";
export const WORKBENCH_SESSION_TTL_SECONDS = 60 * 30;
export const WORKBENCH_PROTOCOL_PREFIX = "__bunli_workbench__:";

export type RunPreset = "framework" | "toolchain";

export const PRESET_COMMANDS: Record<RunPreset, string> = {
  framework: `bun run ${DEFAULT_WORKBENCH_WORKSPACE}/src/index.ts`,
  toolchain: "bun --version && bunli --version && bunli --help",
};

function quoteForShell(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

export function getWorkbenchWorkspace(env: Pick<Env, "WORKBENCH_WORKSPACE_DIR">): string {
  const configured = env.WORKBENCH_WORKSPACE_DIR.trim();
  return configured.length > 0 ? configured : DEFAULT_WORKBENCH_WORKSPACE;
}

export function getWorkbenchSrcDir(env: Pick<Env, "WORKBENCH_WORKSPACE_DIR">): string {
  return `${getWorkbenchWorkspace(env)}/src`;
}

export function getWorkbenchFilePath(env: Pick<Env, "WORKBENCH_WORKSPACE_DIR">): string {
  return `${getWorkbenchSrcDir(env)}/index.ts`;
}

export function getPresetCommand(env: Pick<Env, "WORKBENCH_WORKSPACE_DIR">, preset: RunPreset): string {
  if (preset === "framework") {
    return `bun run ${getWorkbenchFilePath(env)}`;
  }

  return PRESET_COMMANDS[preset];
}

export function buildWorkbenchExecCommand(
  env: Pick<Env, "WORKBENCH_WORKSPACE_DIR">,
  preset: RunPreset,
  runId: string,
  completionToken: string
): string {
  const command = getPresetCommand(env, preset);
  const framePrefix =
    `${WORKBENCH_PROTOCOL_PREFIX}` +
    `${JSON.stringify({ type: "exit", runId, completionToken }).slice(0, -1)},"code":`;

  const script = [
    `emit_frame() { printf '%s%s%s\\n' ${quoteForShell(framePrefix)} "$1" ${quoteForShell("}")};`,
    'trap \'status=$?; emit_frame "$status"\' EXIT',
    command,
  ].join("\n");

  return `sh -lc ${quoteForShell(script)}`;
}

/** Fallback source written to sandbox if no file exists yet */
export const DEFAULT_SOURCE_FILE = `import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'

const helloCommand = defineCommand({
  name: 'hello',
  description: 'Say hello',
  options: {
    name: option(z.string().default('bunli'), { short: 'n' }),
    excited: option(z.boolean().default(false), { short: 'e' }),
  },
  handler: async ({ flags, colors }) => {
    const suffix = flags.excited ? '!' : '.'
    console.log(colors.green(\`Hello, \${flags.name}\${suffix}\`))
  }
});

if (Bun.argv.length <= 2) {
  Bun.argv.push('hello', '-n', 'bunli')
}

const cli = await createCLI({
  name: 'workbench',
  version: '0.1.0',
  description: 'Runnable bunli workbench demo',
});

cli.command(helloCommand);

await cli.run();
`;
