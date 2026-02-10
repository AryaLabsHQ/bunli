/* eslint-disable no-console */
/**
 * Workaround for @bomb.sh/tab@0.0.13 packaging bug:
 * - package.json points "types" to dist/t.d.ts
 * - published package ships dist/t-<hash>.d.ts instead
 *
 * Until upstream fixes this, we copy dist/t-*.d.ts to dist/t.d.ts (idempotent).
 */

const fs = require('node:fs');
const path = require('node:path');

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function findUp(startDir, predicate) {
  let dir = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (predicate(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function main() {
  const workspaceRoot = findUp(process.cwd(), (dir) =>
    exists(path.join(dir, 'node_modules', '@bomb.sh', 'tab', 'dist'))
  );

  if (!workspaceRoot) {
    // Nothing to do (dependency not installed or not hoisted here yet).
    return;
  }

  const distDir = path.join(workspaceRoot, 'node_modules', '@bomb.sh', 'tab', 'dist');
  const target = path.join(distDir, 't.d.ts');
  if (exists(target)) return;

  const entries = fs.readdirSync(distDir);
  const candidates = entries
    .filter((f) => /^t-[^/]+\.d\.ts$/.test(f))
    .sort();

  if (candidates.length === 0) {
    console.warn('[bunli] @bomb.sh/tab types fix: no dist/t-*.d.ts found; cannot create dist/t.d.ts');
    return;
  }

  // Pick the last lexicographic match (stable; hash changes between publishes).
  const source = path.join(distDir, candidates[candidates.length - 1]);
  fs.copyFileSync(source, target);
  console.log(`[bunli] @bomb.sh/tab types fix: copied ${path.basename(source)} -> ${path.basename(target)}`);
}

main();

