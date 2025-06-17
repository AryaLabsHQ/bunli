#!/usr/bin/env bun
import { $ } from 'bun'

// Clean and create dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

// Build TypeScript files
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: false,
  sourcemap: 'external'
})

console.log('✅ @bunli/test built successfully')