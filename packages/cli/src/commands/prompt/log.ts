import { defineCommand, option } from "@bunli/core";
import { z } from "zod";

export default defineCommand({
  name: "log",
  description: "Log a structured message to stderr",
  options: {
    level: option(z.enum(["info", "warn", "error", "debug"]).optional().default("info"), {
      description: "Log level",
    }),
    time: option(z.boolean().optional().default(false), {
      description: "Include timestamp",
      argumentKind: "flag",
    }),
    prefix: option(z.string().optional(), { description: "Message prefix" }),
  },
  async handler({ flags, positional, colors }) {
    const message = positional.join(" ");
    if (!message) {
      process.stderr.write("Error: no message provided\n");
      process.exit(1);
      return;
    }

    const parts: string[] = [];

    if (flags.time) {
      parts.push(colors.dim(new Date().toISOString()));
    }

    const levelColors: Record<string, (s: string) => string> = {
      info: colors.blue,
      warn: colors.yellow,
      error: colors.red,
      debug: colors.dim,
    };
    const colorFn = levelColors[flags.level] ?? colors.blue;
    parts.push(colorFn(flags.level.toUpperCase()));

    if (flags.prefix) {
      parts.push(colors.bold(flags.prefix));
    }

    parts.push(message);

    process.stderr.write(parts.join(" ") + "\n");
  },
});
