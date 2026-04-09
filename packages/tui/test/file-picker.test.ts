import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listDirectory, formatSize } from "../src/components/file-picker-utils.js";

const testDir = join(tmpdir(), `bunli-file-picker-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });

  // Create directories
  mkdirSync(join(testDir, "alpha-dir"), { recursive: true });
  mkdirSync(join(testDir, "beta-dir"), { recursive: true });
  mkdirSync(join(testDir, ".hidden-dir"), { recursive: true });

  // Create files
  writeFileSync(join(testDir, "readme.md"), "hello");
  writeFileSync(join(testDir, "index.ts"), "export {}");
  writeFileSync(join(testDir, "main.tsx"), "export default function() {}");
  writeFileSync(join(testDir, "config.json"), "{}");
  writeFileSync(join(testDir, ".hidden-file"), "secret");
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("listDirectory", () => {
  test("sorts directories first, then alphabetical", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
    });

    const names = entries.map((e) => e.name);
    const dirNames = entries.filter((e) => e.isDirectory).map((e) => e.name);
    const fileNames = entries.filter((e) => !e.isDirectory).map((e) => e.name);

    // Directories come first
    expect(names.indexOf(dirNames[0]!)).toBeLessThan(names.indexOf(fileNames[0]!));

    // Directories are sorted alphabetically
    expect(dirNames).toEqual([...dirNames].sort((a, b) => a.localeCompare(b)));

    // Files are sorted alphabetically
    expect(fileNames).toEqual([...fileNames].sort((a, b) => a.localeCompare(b)));
  });

  test("filters hidden files when showHidden is false", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
    });

    const names = entries.map((e) => e.name);
    expect(names).not.toContain(".hidden-dir");
    expect(names).not.toContain(".hidden-file");
  });

  test("shows hidden files when showHidden is true", () => {
    const entries = listDirectory(testDir, {
      showHidden: true,
      allowFiles: true,
      allowDirectories: true,
    });

    const names = entries.map((e) => e.name);
    expect(names).toContain(".hidden-dir");
    expect(names).toContain(".hidden-file");
  });

  test("filters by file extensions", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
      fileExtensions: [".ts", ".tsx"],
    });

    const fileNames = entries.filter((e) => !e.isDirectory).map((e) => e.name);
    expect(fileNames).toContain("index.ts");
    expect(fileNames).toContain("main.tsx");
    expect(fileNames).not.toContain("readme.md");
    expect(fileNames).not.toContain("config.json");
  });

  test("still shows directories when filtering by extension", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
      fileExtensions: [".ts"],
    });

    const dirNames = entries.filter((e) => e.isDirectory).map((e) => e.name);
    expect(dirNames).toContain("alpha-dir");
    expect(dirNames).toContain("beta-dir");
  });

  test("hides files when allowFiles is false", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: false,
      allowDirectories: true,
    });

    expect(entries.every((e) => e.isDirectory)).toBe(true);
    expect(entries.length).toBe(2);
  });

  test("hides directories when allowDirectories is false", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: false,
    });

    expect(entries.every((e) => !e.isDirectory)).toBe(true);
    expect(entries.map((e) => e.name)).toContain("readme.md");
  });

  test("includes size and permissions in entries", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
    });

    const readme = entries.find((e) => e.name === "readme.md");
    expect(readme).toBeDefined();
    expect(readme!.size).toBe(5); // 'hello' is 5 bytes
    expect(readme!.permissions).toBeDefined();
  });

  test("returns empty array for non-existent directory", () => {
    const entries = listDirectory("/nonexistent/path/that/does/not/exist", {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
    });

    expect(entries).toEqual([]);
  });

  test("entries have correct path", () => {
    const entries = listDirectory(testDir, {
      showHidden: false,
      allowFiles: true,
      allowDirectories: true,
    });

    const readme = entries.find((e) => e.name === "readme.md");
    expect(readme!.path).toBe(join(testDir, "readme.md"));
  });
});

describe("formatSize", () => {
  test("formats bytes", () => {
    expect(formatSize(0)).toBe("0B");
    expect(formatSize(512)).toBe("512B");
    expect(formatSize(1023)).toBe("1023B");
  });

  test("formats kilobytes", () => {
    expect(formatSize(1024)).toBe("1.0K");
    expect(formatSize(1536)).toBe("1.5K");
    expect(formatSize(1024 * 1023)).toBe("1023.0K");
  });

  test("formats megabytes", () => {
    expect(formatSize(1024 * 1024)).toBe("1.0M");
    expect(formatSize(1024 * 1024 * 5.5)).toBe("5.5M");
  });

  test("formats gigabytes", () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe("1.0G");
    expect(formatSize(1024 * 1024 * 1024 * 2.5)).toBe("2.5G");
  });
});
