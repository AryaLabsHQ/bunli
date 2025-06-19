#!/usr/bin/env bun
import { $ } from 'bun'
import { join } from 'path'

const rootDir = join(import.meta.dir, '..')

// Clean dist directory
await $`rm -rf ${rootDir}/dist`

// Generate TypeScript declarations
console.log('📦 Building @bunli/ui types...')
await $`cd ${rootDir} && tsc`

console.log('✅ Build complete!')