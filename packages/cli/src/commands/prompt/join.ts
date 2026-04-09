import { defineCommand, option } from "@bunli/core";
import { readStdinLines, writeStdout } from "@bunli/utils";
import { z } from "zod";

type JoinAlignment = "top" | "center" | "bottom" | "left" | "right";

function padLine(line: string, width: number, align: "left" | "center" | "right"): string {
  const diff = Math.max(0, width - line.length);
  if (diff === 0) return line;
  if (align === "right") return " ".repeat(diff) + line;
  if (align === "center") {
    const left = Math.floor(diff / 2);
    return " ".repeat(left) + line + " ".repeat(diff - left);
  }
  return line + " ".repeat(diff);
}

function splitAndPadBlocks(blocks: string[], align: JoinAlignment, maxLines: number): string[][] {
  return blocks.map((block) => {
    const lines = block.split("\n");
    const diff = Math.max(0, maxLines - lines.length);
    let topPad = 0;
    let bottomPad = 0;

    if (align === "bottom" || align === "right") {
      topPad = diff;
    } else if (align === "center") {
      topPad = Math.floor(diff / 2);
      bottomPad = diff - topPad;
    } else {
      bottomPad = diff;
    }

    return [...Array<string>(topPad).fill(""), ...lines, ...Array<string>(bottomPad).fill("")];
  });
}

export default defineCommand({
  name: "join",
  description: "Join text blocks together",
  options: {
    horizontal: option(z.boolean().optional().default(false), {
      description: "Join horizontally",
      argumentKind: "flag",
    }),
    separator: option(z.string().optional().default(""), {
      description: "Separator between blocks",
    }),
    align: option(z.string().optional().default("left"), {
      description: "Alignment (left, center, right)",
    }),
  },
  async handler({ flags, positional }) {
    let blocks: string[];

    if (positional.length > 0) {
      blocks = positional;
    } else {
      const lines = await readStdinLines();
      // Split blocks on "---" delimiter
      const raw = lines.join("\n");
      blocks = raw
        .split("---")
        .map((b) => b.trim())
        .filter(Boolean);
    }

    if (blocks.length === 0) {
      return;
    }

    const sep = flags.separator;
    const align = flags.align as JoinAlignment;
    let output: string;

    if (flags.horizontal) {
      const blockLines = blocks.map((b) => b.split("\n"));
      const maxLines = Math.max(...blockLines.map((bl) => bl.length));
      const paddedBlocks = splitAndPadBlocks(blocks, align, maxLines);
      const maxWidths = paddedBlocks.map((lines) =>
        Math.max(...lines.map((line) => line.length), 0),
      );
      const rows: string[] = [];
      for (let i = 0; i < maxLines; i++) {
        const parts = paddedBlocks.map((lines, idx) => {
          const line = lines[i] ?? "";
          return padLine(line, maxWidths[idx] ?? 0, "left");
        });
        rows.push(parts.join(sep));
      }
      output = rows.join("\n");
    } else {
      const allLines = blocks.flatMap((block) => block.split("\n"));
      const maxWidth = Math.max(...allLines.map((line) => line.length), 0);
      const lineAlign =
        align === "right" || align === "bottom" ? "right" : align === "center" ? "center" : "left";
      const normalizedBlocks = blocks.map((block) =>
        block
          .split("\n")
          .map((line) => padLine(line, maxWidth, lineAlign))
          .join("\n"),
      );
      output = normalizedBlocks.join(sep ? `\n${sep}\n` : "\n");
    }

    writeStdout(output);
  },
});
