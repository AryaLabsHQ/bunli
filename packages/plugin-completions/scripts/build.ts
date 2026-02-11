#!/usr/bin/env bun

import { $ } from 'bun'
import { join } from 'node:path'

const packageDir = join(import.meta.dir, '..')
process.chdir(packageDir)

await $`rm -rf dist`
await $`mkdir -p dist`

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  packages: 'bundle',
  external: ['@bunli/core', '@bunli/core/plugin']
})

if (!result.success) {
  console.error('❌ @bunli/plugin-completions runtime bundle failed')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('✅ @bunli/plugin-completions runtime bundled')
