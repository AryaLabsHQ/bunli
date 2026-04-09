import { afterEach, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { createStore, StoreValidationError } from "../src/index.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("createStore rejects invalid persisted boolean literals", async () => {
  const dir = makeTempDir("bunli-store-");
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify({ enabled: "maybe" }));

  const store = createStore({
    dirPath: dir,
    fields: {
      enabled: { type: "boolean" },
    },
  });

  await expect(store.read()).rejects.toBeInstanceOf(StoreValidationError);
});

test("createStore still coerces recognized boolean string literals", async () => {
  const dir = makeTempDir("bunli-store-");
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify({ enabled: "0" }));

  const store = createStore({
    dirPath: dir,
    fields: {
      enabled: { type: "boolean" },
    },
  });

  await expect(store.read()).resolves.toEqual({ enabled: false });
});

test("createStore treats non-object persisted JSON as missing state", async () => {
  const dir = makeTempDir("bunli-store-");
  fs.writeFileSync(path.join(dir, "config.json"), "42");

  const store = createStore({
    dirPath: dir,
    fields: {
      enabled: { type: "boolean", default: true },
    },
  });

  await expect(store.read()).resolves.toEqual({ enabled: true });
});
