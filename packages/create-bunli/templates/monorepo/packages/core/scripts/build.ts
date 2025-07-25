#!/usr/bin/env bun
import { $ } from 'bun'

// Clean dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

// Build TypeScript files
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: false,
  external: ['@bunli/core', '@{{projectName}}/utils', 'zod']
})

console.log('✅ @{{projectName}}/core built successfully')