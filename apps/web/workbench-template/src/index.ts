import { createCLI, defineCommand, option } from "@bunli/core";
import { z } from "zod";

const hello = defineCommand({
  name: "hello",
  description: "Say hello",
  options: {
    name: option(z.string().default("bunli"), { short: "n" }),
    excited: option(z.boolean().default(false), { short: "e" }),
  },
  handler: async ({ flags, colors }) => {
    const suffix = flags.excited ? "!" : ".";
    console.log(colors.green(`Hello, ${flags.name}${suffix}`));
  },
});

if (Bun.argv.length <= 2) {
  Bun.argv.push("hello", "-n", "bunli");
}

const cli = await createCLI({
  name: "workbench",
  version: "0.1.0",
  description: "Runnable bunli workbench demo",
});

cli.command(hello);

await cli.run();
