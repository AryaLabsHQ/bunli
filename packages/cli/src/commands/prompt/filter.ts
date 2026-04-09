import { defineCommand, option } from "@bunli/core";
import { readStdinLines, writeStdout, writeStdoutLines } from "@bunli/utils";
import { z } from "zod";

export default defineCommand({
  name: "filter",
  description: "Fuzzy-filter from a list of options",
  options: {
    placeholder: option(z.string().optional(), { description: "Search placeholder text" }),
    limit: option(z.number().optional(), { description: "Max selections" }),
    height: option(z.number().optional().default(10), { description: "Visible items" }),
  },
  async handler({ flags, positional, prompt }) {
    let items = positional.length > 0 ? positional : [];
    if (items.length === 0) {
      items = await readStdinLines();
    }
    if (items.length === 0) {
      process.stderr.write("Error: no items provided\n");
      process.exit(1);
    }

    const options = items.map((item) => ({ label: item, value: item }));
    const multiple = typeof flags.limit === "number";
    const selected = await prompt.filter("Filter", {
      options,
      placeholder: flags.placeholder,
      multiple,
      limit: flags.limit,
      height: flags.height,
      fuzzy: true,
    });

    if (Array.isArray(selected)) {
      writeStdoutLines(selected);
      return;
    }

    writeStdout(selected);
  },
});
