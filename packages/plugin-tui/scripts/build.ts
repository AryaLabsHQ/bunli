#!/usr/bin/env bun

import { $ } from 'bun'
import { join } from 'path'

const rootDir = join(import.meta.dir, '..')

// Clean dist directory
await $`rm -rf ${rootDir}/dist`

// Run TypeScript compiler for type checking and declarations
console.log('🔨 Building types...')
try {
  await $`cd ${rootDir} && tsc`
} catch (error) {
  console.warn('⚠️  TypeScript compilation had errors, but continuing build...')
}

// Copy source files to dist for runtime (Bun runs TypeScript directly)
console.log('📦 Preparing distribution...')
await $`cp -r ${rootDir}/src/* ${rootDir}/dist/`

console.log('✅ Build complete!')