/**
 * Copies playground assets (templates, type definitions) to public/playground/
 * so they can be served as static assets and fetched at runtime by Monaco.
 *
 * Run before dev or build:
 *   bun scripts/copy-playground-assets.ts
 */

import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const monorepoRoot = resolve(appRoot, "../..");
const dest = resolve(appRoot, "public/playground");

// Clean and recreate
if (existsSync(dest)) {
  cpSync(dest, dest, { recursive: true }); // no-op, but ensure it exists
}
mkdirSync(resolve(dest, "templates"), { recursive: true });
mkdirSync(resolve(dest, "types"), { recursive: true });

// --- Templates ---
// Copy the basic template command (default editor content)
cpSync(
  resolve(monorepoRoot, "packages/create-bunli/templates/basic/src/commands/hello.ts"),
  resolve(dest, "templates/hello.ts")
);

// --- Type definitions ---
// Copy core types for Monaco IntelliSense
const coreDistDir = resolve(monorepoRoot, "packages/core/dist");
const typeFiles = ["types.d.ts", "cli.d.ts"];

for (const file of typeFiles) {
  const src = resolve(coreDistDir, file);
  if (existsSync(src)) {
    cpSync(src, resolve(dest, "types", file));
  } else {
    console.warn(`⚠ Missing ${src} — run 'bun run build' in packages/core first`);
  }
}

console.log("✓ Playground assets copied to public/playground/");
