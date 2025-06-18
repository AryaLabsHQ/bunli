#!/usr/bin/env bun

import { $ } from "bun"
import { join } from "path"

// Ensure we're in the right directory
const packageDir = join(import.meta.dir, "..")
process.chdir(packageDir)

// Clean dist directory
await $`rm -rf dist`

// Generate type definitions
await $`tsc`

console.log("✅ @bunli/plugin-ai-detect built successfully")