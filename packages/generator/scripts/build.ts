#!/usr/bin/env bun

import { build } from 'bun'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

const packageRoot = new URL('../', import.meta.url).pathname
const distDir = join(packageRoot, 'dist')

console.log('Building @bunli/generator...')

// Ensure dist directory exists
await mkdir(distDir, { recursive: true })

// Build the package
const result = await build({
  entrypoints: [join(packageRoot, 'src/index.ts')],
  outdir: distDir,
  target: 'bun',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  minify: false
})

if (result.success) {
  console.log('✓ Build successful')
  console.log(`  Output: ${distDir}`)
} else {
  console.error('✗ Build failed')
  console.error(result.logs)
  process.exit(1)
}
