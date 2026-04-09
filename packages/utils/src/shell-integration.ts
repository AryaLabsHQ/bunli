/**
 * Shell integration utilities for CLI shell commands.
 *
 * Provides stdin/stdout helpers and conventional exit codes so that
 * `bunli shell *` subcommands compose cleanly with other shell tools.
 */

/**
 * Read lines from stdin when piped (non-TTY).
 * Returns empty array if stdin is a TTY.
 */
export async function readStdinLines(delimiter?: string): Promise<string[]> {
  if (process.stdin.isTTY) return [];

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const data = Buffer.concat(chunks).toString("utf-8");
  if (data.length === 0) return [];

  if (delimiter !== undefined) {
    return data.split(delimiter);
  }

  const normalized = data.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) {
    lines.pop();
  }
  return lines;
}

/**
 * Write result to stdout, stripping ANSI when piping to non-TTY.
 */
export function writeStdout(value: string): void {
  const output = process.stdout.isTTY ? value : stripAnsi(value);
  process.stdout.write(output + "\n");
}

/**
 * Write multiple values to stdout, one per line.
 */
export function writeStdoutLines(values: string[]): void {
  for (const value of values) {
    writeStdout(value);
  }
}

/**
 * Strip ANSI escape codes from a string.
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Exit codes matching gum conventions */
export const EXIT_CODES = {
  SUCCESS: 0,
  CANCEL: 1,
  TIMEOUT: 124,
  SIGINT: 130,
} as const;
