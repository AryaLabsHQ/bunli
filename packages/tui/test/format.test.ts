import { describe, expect, test } from "bun:test";

import { formatMarkdown, formatCode, formatEmoji, format } from "../src/utils/format.js";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";
const UNDERLINE = "\x1b[4m";
const STRIKETHROUGH = "\x1b[9m";
const RESET = "\x1b[0m";

describe("@bunli/tui format", () => {
  describe("formatMarkdown", () => {
    test("applies bold to H1 headers", () => {
      const result = formatMarkdown("# Hello");
      expect(result).toContain(BOLD);
      expect(result).toContain("Hello");
    });

    test("applies bold to H2 headers", () => {
      const result = formatMarkdown("## Subtitle");
      expect(result).toContain(BOLD);
      expect(result).toContain("Subtitle");
    });

    test("applies bold + dim to H3+ headers", () => {
      const result = formatMarkdown("### Deep");
      expect(result).toContain(BOLD);
      expect(result).toContain(DIM);
      expect(result).toContain("Deep");
    });

    test("handles **bold** inline", () => {
      const result = formatMarkdown("This is **bold** text");
      expect(result).toContain(BOLD);
      expect(result).toContain("bold");
    });

    test("handles __bold__ inline", () => {
      const result = formatMarkdown("This is __bold__ text");
      expect(result).toContain(BOLD);
      expect(result).toContain("bold");
    });

    test("handles *italic* inline", () => {
      const result = formatMarkdown("This is *italic* text");
      expect(result).toContain(ITALIC);
      expect(result).toContain("italic");
    });

    test("handles ~~strikethrough~~ inline", () => {
      const result = formatMarkdown("This is ~~removed~~ text");
      expect(result).toContain(STRIKETHROUGH);
      expect(result).toContain("removed");
    });

    test("handles inline `code`", () => {
      const result = formatMarkdown("Use `bun test` here");
      expect(result).toContain(DIM);
      expect(result).toContain("bun test");
    });

    test("handles [links](url)", () => {
      const result = formatMarkdown("Visit [docs](https://example.com)");
      expect(result).toContain(UNDERLINE);
      expect(result).toContain("docs");
      expect(result).toContain("https://example.com");
    });

    test("converts unordered list bullets", () => {
      const result = formatMarkdown("- item one\n- item two");
      expect(result).toContain("\u2022");
      expect(result).toContain("item one");
      expect(result).toContain("item two");
    });

    test("converts * list bullets", () => {
      const result = formatMarkdown("* first\n* second");
      expect(result).toContain("\u2022");
    });

    test("handles blockquotes", () => {
      const result = formatMarkdown("> This is a quote");
      expect(result).toContain("\u2502");
      expect(result).toContain(ITALIC);
      expect(result).toContain("This is a quote");
    });

    test("converts horizontal rules", () => {
      const result = formatMarkdown("---");
      expect(result).toContain("\u2500");
    });

    test("handles code blocks", () => {
      const result = formatMarkdown("```\nconst x = 1\n```");
      expect(result).toContain(DIM);
      expect(result).toContain("const x = 1");
    });

    test("preserves ordered list items", () => {
      const result = formatMarkdown("1. First\n2. Second");
      expect(result).toContain("1. First");
      expect(result).toContain("2. Second");
    });

    test("handles multiple transforms in one line", () => {
      const result = formatMarkdown("**bold** and `code`");
      expect(result).toContain(BOLD);
      expect(result).toContain(DIM);
    });
  });

  describe("formatCode", () => {
    test("highlights keywords", () => {
      const result = formatCode("const x = 1");
      expect(result).toContain("\x1b[");
      expect(result).toContain("const");
    });

    test("highlights strings", () => {
      const result = formatCode('const s = "hello"');
      expect(result).toContain("hello");
      expect(result).toContain("\x1b[38;2;");
    });

    test("highlights numbers", () => {
      const result = formatCode("const n = 42");
      expect(result).toContain("42");
    });

    test("dims comments", () => {
      const result = formatCode("// this is a comment");
      expect(result).toContain(DIM);
      expect(result).toContain("this is a comment");
    });

    test("dims hash comments", () => {
      const result = formatCode("# python comment");
      expect(result).toContain(DIM);
    });

    test("handles multi-line code", () => {
      const result = formatCode("function add(a, b) {\n  return a + b\n}");
      expect(result).toContain("function");
      expect(result).toContain("return");
    });

    test("highlights multiple keywords", () => {
      const result = formatCode("export async function run() {}");
      // Each keyword should be colored
      const keywordColor = "\x1b[38;2;100;150;255m";
      expect(result).toContain(keywordColor);
    });
  });

  describe("formatEmoji", () => {
    test("replaces known shortcodes", () => {
      expect(formatEmoji(":rocket: launch")).toBe("\u{1F680} launch");
    });

    test("preserves unknown shortcodes", () => {
      expect(formatEmoji(":unknown: stays")).toBe(":unknown: stays");
    });

    test("replaces multiple shortcodes", () => {
      const result = formatEmoji(":fire: :star: :check:");
      expect(result).toBe("\u{1F525} \u2B50 \u2705");
    });

    test("replaces heart emoji", () => {
      expect(formatEmoji(":heart:")).toBe("\u2764\uFE0F");
    });

    test("handles text with no shortcodes", () => {
      expect(formatEmoji("plain text")).toBe("plain text");
    });

    test("handles shortcodes at boundaries", () => {
      expect(formatEmoji(":tada:")).toBe("\u{1F389}");
    });
  });

  describe("format", () => {
    test("dispatches markdown type", () => {
      const result = format("# Title", "markdown");
      expect(result).toContain(BOLD);
      expect(result).toContain("Title");
    });

    test("dispatches code type", () => {
      const result = format("const x = 1", "code");
      expect(result).toContain("\x1b[");
    });

    test("dispatches emoji type", () => {
      const result = format(":rocket:", "emoji");
      expect(result).toBe("\u{1F680}");
    });

    test("dispatches template type (passthrough)", () => {
      const result = format("hello world", "template");
      expect(result).toBe("hello world");
    });
  });
});
