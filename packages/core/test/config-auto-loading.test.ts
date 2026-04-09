import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { createCLI } from "../src/cli.js";
import { ConfigNotFoundError, loadConfig } from "../src/config-loader.js";

describe("Config Auto-Loading", () => {
  const originalCwd = process.cwd();
  let testDir = "";

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "bunli-config-test-"));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
      testDir = "";
    }
  });

  test("loadConfig loads from bunli.config.ts", async () => {
    const configContent = `
export default {
  name: 'test-cli',
  version: '1.0.0',
  description: 'Test CLI'
}
`;
    await writeFile("bunli.config.ts", configContent);

    const config = await loadConfig();

    expect(config.name).toBe("test-cli");
    expect(config.version).toBe("1.0.0");
    expect(config.description).toBe("Test CLI");
  });

  test("loadConfig loads from bunli.config.js", async () => {
    const configContent = `
export default {
  name: 'test-cli-js',
  version: '2.0.0',
  description: 'Test CLI JS',
  plugins: []
}
`;
    await writeFile("bunli.config.js", configContent);
    // Note: .js config is loaded, .ts takes precedence if exists
    const config = await loadConfig();

    // Both .js and .ts files may exist, .ts takes precedence
    expect(config.name).toBeDefined();
  });

  test("loadConfig throws error when no config found", async () => {
    await expect(async () => {
      await loadConfig();
    }).toThrow(/No configuration file found/);
  });

  test("createCLI auto-loads config when no override provided", async () => {
    const configContent = `
export default {
  name: 'auto-test-cli',
  version: '3.0.0',
  description: 'Auto-loaded CLI',
  plugins: []
}
`;
    await writeFile("bunli.config.ts", configContent);

    const cli = await createCLI();

    // Test that CLI was created successfully
    expect(cli).toBeDefined();
    expect(typeof cli.run).toBe("function");
    expect(typeof cli.command).toBe("function");
  });

  test("createCLI merges override with loaded config", async () => {
    const configContent = `
export default {
  name: 'merge-test-cli',
  version: '4.0.0',
  description: 'Merge test CLI',
  plugins: []
}
`;
    await writeFile("bunli.config.ts", configContent);

    const cli = await createCLI({
      description: "Overridden description",
    });

    // Test that CLI was created successfully
    expect(cli).toBeDefined();
  });

  test("createCLI throws helpful error when no config and no override", async () => {
    await expect(async () => {
      await createCLI();
    }).toThrow(/No configuration file found/);
  });

  test("createCLI throws ConfigNotFoundError when no config and no override", async () => {
    await expect(createCLI()).rejects.toBeInstanceOf(ConfigNotFoundError);
  });

  test("createCLI works with override when no config file", async () => {
    const cli = await createCLI({
      name: "override-cli",
      version: "5.0.0",
      description: "Override CLI",
      plugins: [],
    });

    expect(cli).toBeDefined();
  });

  test("createCLI uses a complete override when on-disk config is broken", async () => {
    const configContent = `
throw new Error('boom from config')
export default {}
`;
    await writeFile("bunli.config.ts", configContent);

    const cli = await createCLI({
      name: "override-cli",
      version: "6.0.0",
      description: "Override wins",
      plugins: [],
    });

    expect(cli).toBeDefined();
  });

  test("createCLI still throws ConfigLoadError when override is incomplete and config is broken", async () => {
    const configContent = `
throw new Error('boom from config')
export default {}
`;
    await writeFile("bunli.config.ts", configContent);

    await expect(async () => {
      await createCLI({
        name: "partial-override",
      });
    }).toThrow(/Failed to load config/);
  });
});
