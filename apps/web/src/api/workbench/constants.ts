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

function quoteForShell(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

export function getWorkbenchSrcDir(): string {
  return `${workbenchConfig.workspace}/src`;
}

export function getWorkbenchFilePath(): string {
  return `${getWorkbenchSrcDir()}/index.ts`;
}

export function getPresetCommand(preset: RunPreset): string {
  if (preset === "framework") {
    return `bun run ${getWorkbenchFilePath()}`;
  }

  return "bun --version && bunli --version && bunli --help";
}

export function buildWorkbenchExecCommand(
  preset: RunPreset,
  runId: string,
  completionToken: string
): string {
  const command = getPresetCommand(preset);
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
