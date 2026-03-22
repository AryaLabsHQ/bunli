/** Workbench runtime configuration — single source of truth. */
export const workbenchConfig = {
  workspace: "/workspace/demo",
  bunVersion: "1.2.2",
  bunliVersion: "0.5.3",
  sandboxNetwork: "off" as "on" | "off",
  runTimeoutMs: 10_000,
  sleepAfter: "10m",
  sessionTtlSeconds: 60 * 30,
} as const;

export const WORKBENCH_PROTOCOL_PREFIX = "__bunli_workbench__:";

export type RunPreset = "framework" | "toolchain";

export interface WorkbenchRuntimeEnv {
  WORKBENCH_WORKSPACE_DIR?: string;
  WORKBENCH_BUN_VERSION?: string;
  WORKBENCH_BUNLI_VERSION?: string;
  WORKBENCH_SANDBOX_NETWORK?: string;
}

function quoteForShell(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function readWorkbenchSetting(
  envValue: string | undefined,
  processValue: string | undefined,
  fallback: string
): string {
  const value = envValue ?? processValue;
  return value?.trim() ? value.trim() : fallback;
}

export function getWorkbenchWorkspace(env?: WorkbenchRuntimeEnv): string {
  return readWorkbenchSetting(
    env?.WORKBENCH_WORKSPACE_DIR,
    process.env.WORKBENCH_WORKSPACE_DIR,
    workbenchConfig.workspace
  );
}

export function getWorkbenchBunVersion(env?: WorkbenchRuntimeEnv): string {
  return readWorkbenchSetting(
    env?.WORKBENCH_BUN_VERSION,
    process.env.WORKBENCH_BUN_VERSION,
    workbenchConfig.bunVersion
  );
}

export function getWorkbenchBunliVersion(env?: WorkbenchRuntimeEnv): string {
  return readWorkbenchSetting(
    env?.WORKBENCH_BUNLI_VERSION,
    process.env.WORKBENCH_BUNLI_VERSION,
    workbenchConfig.bunliVersion
  );
}

export function getWorkbenchSandboxNetwork(
  env?: WorkbenchRuntimeEnv
): "on" | "off" {
  return readWorkbenchSetting(
    env?.WORKBENCH_SANDBOX_NETWORK,
    process.env.WORKBENCH_SANDBOX_NETWORK,
    workbenchConfig.sandboxNetwork
  ) === "on"
    ? "on"
    : "off";
}

export function getWorkbenchSrcDir(env?: WorkbenchRuntimeEnv): string {
  return `${getWorkbenchWorkspace(env)}/src`;
}

export function getWorkbenchFilePath(env?: WorkbenchRuntimeEnv): string {
  return `${getWorkbenchSrcDir(env)}/index.ts`;
}

export function getPresetCommand(
  preset: RunPreset,
  env?: WorkbenchRuntimeEnv
): string {
  if (preset === "framework") {
    return `bun run ${getWorkbenchFilePath(env)}`;
  }

  return "bun --version && bunli --version && bunli --help";
}

export function buildWorkbenchExecCommand(
  preset: RunPreset,
  runId: string,
  completionToken: string,
  env?: WorkbenchRuntimeEnv
): string {
  const command = getPresetCommand(preset, env);
  const framePrefix =
    `${WORKBENCH_PROTOCOL_PREFIX}` +
    `${JSON.stringify({ type: "exit", runId, completionToken }).slice(0, -1)},"code":`;

  const script = [
    `emit_frame() { printf '%s%s}\\n' ${quoteForShell(framePrefix)} "$1"; }`,
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
