import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { linkFixturePackages } from "./helpers/install-fixture.js";
import { createTempFixtureDir, removeTempFixtureDir } from "./helpers/temp-dir.js";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntrypoint = path.join(repoRoot, "packages/cli/src/cli.ts");

interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(cwd: string, args: string[]): Promise<CliRunResult> {
  const proc = Bun.spawn(["bun", cliEntrypoint, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}

function writeBaseFixture(fixtureDir: string, configContents: string) {
  writeFileSync(
    path.join(fixtureDir, "package.json"),
    JSON.stringify(
      {
        name: "bunli-dev-e2e-fixture",
        version: "0.0.0",
        type: "module",
      },
      null,
      2,
    ),
  );

  writeFileSync(path.join(fixtureDir, "bunli.config.ts"), configContents);
}

function writeCommandFile(baseDir: string, commandFile: string, commandName: string) {
  const fullFile = path.join(baseDir, commandFile);
  mkdirSync(path.dirname(fullFile), { recursive: true });
  writeFileSync(
    fullFile,
    `
import { defineCommand } from '@bunli/core'

export default defineCommand({
  name: '${commandName}',
  description: '${commandName} command',
  handler: () => {}
})
`,
  );
}

function writeEntryFile(baseDir: string, entryFile: string, importedCommandPath: string) {
  const fullFile = path.join(baseDir, entryFile);
  mkdirSync(path.dirname(fullFile), { recursive: true });
  writeFileSync(
    fullFile,
    `
import { createCLI } from '@bunli/core'
import registeredCommand from '${importedCommandPath}'

const cli = await createCLI({
  name: 'fixture',
  version: '0.0.0'
})

cli.command(registeredCommand)
`,
  );
}

describe("dev e2e - command entry precedence", () => {
  let fixtureDir = "";

  beforeEach(() => {
    fixtureDir = createTempFixtureDir("bunli-dev-e2e");
  });

  afterEach(() => {
    if (fixtureDir) {
      removeTempFixtureDir(fixtureDir);
    }
  });

  test("uses config.commands.entry when --entry is not provided", async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './src/fallback-entry.ts' },
  commands: { entry: './src/config-entry.ts' }
}\n`,
    );
    writeCommandFile(fixtureDir, "src/commands/from-config.ts", "from-config");
    writeEntryFile(fixtureDir, "src/config-entry.ts", "./commands/from-config.js");
    writeEntryFile(fixtureDir, "src/fallback-entry.ts", "./commands/from-config.js");
    linkFixturePackages(fixtureDir, repoRoot, ["@bunli/core"]);

    const result = await runCli(fixtureDir, ["dev", "--watch=false"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const generatedPath = path.join(fixtureDir, ".bunli/commands.gen.ts");

    expect(result.exitCode).toBe(0);
    expect(combinedOutput).toContain("Types generated");
    expect(combinedOutput).toContain("Generated types for 1 commands");
    expect(existsSync(generatedPath)).toBe(true);
    expect(readFileSync(generatedPath, "utf8")).toContain("'from-config'");
  });

  test("uses --entry value over config.commands.entry", async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './src/fallback-entry.ts' },
  commands: { entry: './src/config-entry.ts' }
}\n`,
    );
    writeCommandFile(fixtureDir, "src/commands/from-config.ts", "from-config");
    writeCommandFile(fixtureDir, "custom/commands/from-flag.ts", "from-flag");
    writeEntryFile(fixtureDir, "src/config-entry.ts", "./commands/from-config.js");
    writeEntryFile(fixtureDir, "custom/entry-flag.ts", "./commands/from-flag.js");
    writeEntryFile(fixtureDir, "src/fallback-entry.ts", "./commands/from-config.js");
    linkFixturePackages(fixtureDir, repoRoot, ["@bunli/core"]);

    const result = await runCli(fixtureDir, [
      "dev",
      "--watch=false",
      "--entry=custom/entry-flag.ts",
    ]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const generatedPath = path.join(fixtureDir, ".bunli/commands.gen.ts");
    const generated = readFileSync(generatedPath, "utf8");

    expect(result.exitCode).toBe(0);
    expect(combinedOutput).toContain("Types generated");
    expect(combinedOutput).toContain("Generated types for 1 commands");
    expect(generated).toContain("'from-flag'");
    expect(generated).not.toContain("'from-config'");
  });

  test("falls back to build.entry when commands.entry is not set", async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './src/build-entry.ts' }
}\n`,
    );
    writeCommandFile(fixtureDir, "src/commands/from-build-entry.ts", "from-build-entry");
    writeEntryFile(fixtureDir, "src/build-entry.ts", "./commands/from-build-entry.js");
    linkFixturePackages(fixtureDir, repoRoot, ["@bunli/core"]);

    const result = await runCli(fixtureDir, ["dev", "--watch=false"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const generatedPath = path.join(fixtureDir, ".bunli/commands.gen.ts");

    expect(result.exitCode).toBe(0);
    expect(combinedOutput).toContain("Types generated");
    expect(combinedOutput).toContain("Generated types for 1 commands");
    expect(existsSync(generatedPath)).toBe(true);
    expect(readFileSync(generatedPath, "utf8")).toContain("'from-build-entry'");
  });

  test("fails with install guidance when project dependencies are missing", async () => {
    writeBaseFixture(
      fixtureDir,
      `export default {
  build: { entry: './src/build-entry.ts' }
}\n`,
    );
    writeCommandFile(fixtureDir, "src/commands/from-build-entry.ts", "from-build-entry");
    writeEntryFile(fixtureDir, "src/build-entry.ts", "./commands/from-build-entry.js");

    const result = await runCli(fixtureDir, ["dev", "--watch=false"]);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("Run 'bun install'");
    expect(combinedOutput).toContain("before running 'bunli dev'");
  });
});
