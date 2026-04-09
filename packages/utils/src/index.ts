import { colors } from "./colors.js";
import type { BunliUtils } from "./types.js";

export * from "./types.js";

export const utils: BunliUtils = {
  colors,
};

export { colors } from "./colors.js";
export {
  EXIT_CODES,
  readStdinLines,
  stripAnsi,
  writeStdout,
  writeStdoutLines,
} from "./shell-integration.js";
export { formatLog, log, type LogLevel, type LogOptions } from "./log.js";

export { validate, validateFields } from "./validation.js";
export { SchemaError, getDotPath } from "@standard-schema/utils";

export { configDir, dataDir, stateDir, cacheDir } from "./xdg.js";
export type { PlatformEnv } from "./xdg.js";
