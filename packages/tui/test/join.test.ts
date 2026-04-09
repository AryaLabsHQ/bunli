import { describe, expect, test } from "bun:test";

import { joinHorizontal, joinVertical } from "../src/utils/join.js";

describe("@bunli/tui join", () => {
  test("joinHorizontal places blocks side by side", () => {
    const result = joinHorizontal("top", "A\nB", "C\nD");
    expect(result).toBe("A C\nB D");
  });

  test("joinHorizontal aligns shorter block to top", () => {
    const result = joinHorizontal("top", "A", "B\nC");
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("A");
    expect(lines[0]).toContain("B");
    expect(lines[1]).toContain("C");
  });

  test("joinHorizontal aligns shorter block to bottom", () => {
    const result = joinHorizontal("bottom", "A", "B\nC");
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("A");
    expect(lines[1]).toContain("C");
  });

  test("joinHorizontal aligns shorter block to center", () => {
    const result = joinHorizontal("center", "X", "A\nB\nC");
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    // X should be on line index 1 (centered in 3 rows)
    expect(lines[1]).toContain("X");
    expect(lines[1]).toContain("B");
  });

  test("joinHorizontal with box drawing", () => {
    const box1 = "\u250c\u2500\u2500\u2500\u2510\n\u2502 A \u2502\n\u2514\u2500\u2500\u2500\u2518";
    const box2 =
      "\u250c\u2500\u2500\u2500\u2510\n\u2502 B \u2502\n\u2502   \u2502\n\u2514\u2500\u2500\u2500\u2518";

    const result = joinHorizontal("top", box1, box2);
    const lines = result.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("\u250c\u2500\u2500\u2500\u2510");
  });

  test("joinVertical stacks blocks", () => {
    const result = joinVertical("left", "hello", "world");
    expect(result).toBe("hello\nworld");
  });

  test("joinVertical centers narrower block", () => {
    const result = joinVertical("center", "hi", "hello");
    const lines = result.split("\n");
    expect(lines[0]).toBe(" hi  ");
    expect(lines[1]).toBe("hello");
  });

  test("joinVertical right-aligns narrower block", () => {
    const result = joinVertical("right", "hi", "hello");
    const lines = result.split("\n");
    expect(lines[0]).toBe("   hi");
    expect(lines[1]).toBe("hello");
  });

  test("joinVertical left-aligns narrower block", () => {
    const result = joinVertical("left", "hi", "hello");
    const lines = result.split("\n");
    expect(lines[0]).toBe("hi   ");
    expect(lines[1]).toBe("hello");
  });

  test("handles ANSI in width calculation", () => {
    const red = "\x1b[31mhi\x1b[0m"; // visible: "hi" (2 chars)
    const result = joinVertical("left", red, "ab");
    const lines = result.split("\n");
    // Both lines should be same visible width (2)
    // The ANSI line should not be over-padded
    expect(lines[1]).toBe("ab");
  });

  test("handles ANSI in horizontal join", () => {
    const red = "\x1b[31mhi\x1b[0m";
    const result = joinHorizontal("top", red, "ab");
    expect(result).toBe("\x1b[31mhi\x1b[0m ab");
  });

  test("handles empty blocks", () => {
    expect(joinHorizontal("top")).toBe("");
    expect(joinVertical("left")).toBe("");
  });

  test("handles single block", () => {
    expect(joinHorizontal("top", "hello")).toBe("hello");
    expect(joinVertical("left", "hello")).toBe("hello");
  });
});
