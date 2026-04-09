import { z } from "zod";

import type { CLIOption } from "./types.js";

/**
 * Built-in global flags available to all commands
 */
export const GLOBAL_FLAGS = {
  help: {
    schema: z.boolean().default(false),
    short: "h",
    description: "Show help",
    argumentKind: "flag",
  },
  version: {
    schema: z.boolean().default(false),
    short: "v",
    description: "Show version",
    argumentKind: "flag",
  },
  "image-mode": {
    schema: z.enum(["off", "auto", "on"]).optional(),
    description: "Terminal image preview mode (off|auto|on)",
  },
  format: {
    schema: z.enum(["json", "yaml", "md", "toon"]).optional(),
    description: "Output format (json|yaml|md|toon)",
  },
  llms: {
    schema: z.boolean().default(false),
    description: "Print compact command manifest (Markdown)",
    argumentKind: "flag",
  },
  "llms-full": {
    schema: z.boolean().default(false),
    description: "Print full command manifest (Markdown)",
    argumentKind: "flag",
  },
} satisfies Record<string, CLIOption>;

export type GlobalFlags = {
  help: boolean;
  version: boolean;
  "image-mode"?: "off" | "auto" | "on";
  format?: "json" | "yaml" | "md" | "toon";
  llms: boolean;
  "llms-full": boolean;
};
