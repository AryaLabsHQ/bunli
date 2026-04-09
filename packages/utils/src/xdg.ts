import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Encapsulates runtime environment values needed for path resolution.
 * Exposed as a parameter to allow deterministic testing without mutating
 * `process.env` or `process.platform`.
 */
export interface PlatformEnv {
  platform: string;
  env: Record<string, string | undefined>;
  homedir: string;
}

function getRuntimeEnv(): PlatformEnv {
  return {
    platform: process.platform,
    env: process.env as Record<string, string | undefined>,
    homedir: homedir(),
  };
}

function validateAppName(appName: string): void {
  if (!appName || appName.trim().length === 0) {
    throw new Error("appName must be a non-empty string");
  }
  if (appName.includes("/") || appName.includes("\\")) {
    throw new Error("appName must not contain path separators");
  }
}

function resolveUnixDir(
  env: PlatformEnv,
  xdgEnvVar: string,
  fallbackSegments: string[],
  appName: string,
): string {
  const xdgValue = env.env[xdgEnvVar];
  const base =
    xdgValue && xdgValue.trim().length > 0 ? xdgValue : join(env.homedir, ...fallbackSegments);
  return join(base, appName);
}

function resolveWindowsDir(
  env: PlatformEnv,
  envVar: string,
  fallbackSegments: string[],
  appName: string,
  ...suffix: string[]
): string {
  const value = env.env[envVar];
  const base = value && value.trim().length > 0 ? value : join(env.homedir, ...fallbackSegments);
  return join(base, appName, ...suffix);
}

/**
 * Resolves the platform-standard config directory for the given app.
 *
 * - Linux / macOS: `$XDG_CONFIG_HOME/<appName>` or `~/.config/<appName>`
 * - Windows: `%APPDATA%/<appName>` or `~/AppData/Roaming/<appName>`
 */
export function configDir(appName: string, env?: PlatformEnv): string {
  validateAppName(appName);
  const e = env ?? getRuntimeEnv();

  switch (e.platform) {
    case "linux":
    case "darwin":
      return resolveUnixDir(e, "XDG_CONFIG_HOME", [".config"], appName);
    case "win32":
      return resolveWindowsDir(e, "APPDATA", ["AppData", "Roaming"], appName);
    default:
      throw new Error(`Unsupported platform: ${e.platform}`);
  }
}

/**
 * Resolves the platform-standard data directory for the given app.
 *
 * - Linux / macOS: `$XDG_DATA_HOME/<appName>` or `~/.local/share/<appName>`
 * - Windows: `%LOCALAPPDATA%/<appName>/Data` or `~/AppData/Local/<appName>/Data`
 */
export function dataDir(appName: string, env?: PlatformEnv): string {
  validateAppName(appName);
  const e = env ?? getRuntimeEnv();

  switch (e.platform) {
    case "linux":
    case "darwin":
      return resolveUnixDir(e, "XDG_DATA_HOME", [".local", "share"], appName);
    case "win32":
      return resolveWindowsDir(e, "LOCALAPPDATA", ["AppData", "Local"], appName, "Data");
    default:
      throw new Error(`Unsupported platform: ${e.platform}`);
  }
}

/**
 * Resolves the platform-standard state directory for the given app.
 *
 * - Linux / macOS: `$XDG_STATE_HOME/<appName>` or `~/.local/state/<appName>`
 * - Windows: `%LOCALAPPDATA%/<appName>/State` or `~/AppData/Local/<appName>/State`
 */
export function stateDir(appName: string, env?: PlatformEnv): string {
  validateAppName(appName);
  const e = env ?? getRuntimeEnv();

  switch (e.platform) {
    case "linux":
    case "darwin":
      return resolveUnixDir(e, "XDG_STATE_HOME", [".local", "state"], appName);
    case "win32":
      return resolveWindowsDir(e, "LOCALAPPDATA", ["AppData", "Local"], appName, "State");
    default:
      throw new Error(`Unsupported platform: ${e.platform}`);
  }
}

/**
 * Resolves the platform-standard cache directory for the given app.
 *
 * - Linux / macOS: `$XDG_CACHE_HOME/<appName>` or `~/.cache/<appName>`
 * - Windows: `%LOCALAPPDATA%/<appName>/Cache` or `~/AppData/Local/<appName>/Cache`
 */
export function cacheDir(appName: string, env?: PlatformEnv): string {
  validateAppName(appName);
  const e = env ?? getRuntimeEnv();

  switch (e.platform) {
    case "linux":
    case "darwin":
      return resolveUnixDir(e, "XDG_CACHE_HOME", [".cache"], appName);
    case "win32":
      return resolveWindowsDir(e, "LOCALAPPDATA", ["AppData", "Local"], appName, "Cache");
    default:
      throw new Error(`Unsupported platform: ${e.platform}`);
  }
}
