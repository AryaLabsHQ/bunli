import type { ImageCapability } from "./types.js";

export interface DetectImageCapabilityInput {
  env?: NodeJS.ProcessEnv;
  stdout?: NodeJS.WriteStream;
}

function isLikelyKittyTerminal(env: NodeJS.ProcessEnv): boolean {
  const term = env.TERM?.toLowerCase() ?? "";
  const termProgram = env.TERM_PROGRAM?.toLowerCase() ?? "";

  if (term.includes("xterm-kitty")) return true;
  if (termProgram === "kitty" || termProgram === "ghostty") return true;
  if (typeof env.KITTY_WINDOW_ID === "string" && env.KITTY_WINDOW_ID.length > 0) return true;

  return false;
}

export function detectImageCapability(input: DetectImageCapabilityInput = {}): ImageCapability {
  const env = input.env ?? process.env;
  const stdout = input.stdout ?? process.stdout;
  const terminal = env.TERM_PROGRAM ?? env.TERM;

  if (!stdout.isTTY) {
    return {
      supported: false,
      protocol: "none",
      reason: "not-interactive",
      terminal,
    };
  }

  if (env.TERM === "dumb") {
    return {
      supported: false,
      protocol: "none",
      reason: "not-interactive",
      terminal,
    };
  }

  if (!isLikelyKittyTerminal(env)) {
    return {
      supported: false,
      protocol: "none",
      reason: "capability-missing",
      terminal,
    };
  }

  return {
    supported: true,
    protocol: "kitty",
    terminal,
  };
}
