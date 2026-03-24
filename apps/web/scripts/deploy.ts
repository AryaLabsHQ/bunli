import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const generatedConfig = resolve(appRoot, "dist/server/wrangler.json");

const args = ["deploy"];
if (existsSync(generatedConfig)) {
  args.push("--config", generatedConfig);
}

const result = spawnSync("wrangler", args, {
  cwd: appRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
