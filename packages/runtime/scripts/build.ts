#!/usr/bin/env bun

import { $ } from 'bun'
import { join } from 'path'

const rootDir = join(import.meta.dir, '..')

await $`rm -rf ${rootDir}/dist`

console.log('🔨 Building types...')
try {
  await $`cd ${rootDir} && tsc`
} catch {
  console.warn('⚠️  TypeScript compilation had errors, but continuing build...')
}

console.log('📦 Preparing distribution...')
await $`mkdir -p ${rootDir}/dist`

console.log('✅ Build complete!')
