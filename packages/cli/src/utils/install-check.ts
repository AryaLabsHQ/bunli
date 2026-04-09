import { existsSync, statSync } from "node:fs";
import path from "node:path";

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

export function hasInstalledProjectDependencies(cwd: string = process.cwd()): boolean {
  return existsSync(path.join(cwd, "node_modules")) && isDirectory(path.join(cwd, "node_modules"));
}

export function getInstallRequiredMessage(
  commandName: string,
  cwd: string = process.cwd(),
): string {
  return `Project dependencies are not installed in ${cwd}. Run 'bun install' before running 'bunli ${commandName}'.`;
}
